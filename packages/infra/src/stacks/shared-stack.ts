import * as cdk from "aws-cdk-lib";
import * as budgets from "aws-cdk-lib/aws-budgets";
import * as cloudwatch from "aws-cdk-lib/aws-cloudwatch";
import * as cwActions from "aws-cdk-lib/aws-cloudwatch-actions";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as events from "aws-cdk-lib/aws-events";
import * as iam from "aws-cdk-lib/aws-iam";
import * as ses from "aws-cdk-lib/aws-ses";
import * as sns from "aws-cdk-lib/aws-sns";
import * as subscriptions from "aws-cdk-lib/aws-sns-subscriptions";
import type { Construct } from "constructs";
import type { InfraConfig } from "../config";

export type SharedStackProps = cdk.StackProps & {
  config: InfraConfig;
  /** Every DynamoDB table (from the DataStack) — each is alarmed individually. */
  tables: dynamodb.ITable[];
};

/**
 * Shared platform services that cut across the apps and share the same
 * lifecycle, region, and owner:
 *  - an EventBridge bus for domain events (decoupled revalidation/automation)
 *  - an SNS alerts topic (CloudWatch alarms + AWS Budgets fan out to email)
 *  - a SES email identity for the contact form (when configured)
 *  - a monthly cost budget, per-table DynamoDB alarms, and an overview dashboard
 *
 * These were previously three micro-stacks; folding them into one keeps the
 * topic→alarm/budget wiring as in-process references instead of brittle
 * CloudFormation exports, which is the idiomatic CDK trade-off (few stacks,
 * many constructs) when resources don't have independent lifecycles.
 */
export class SharedStack extends cdk.Stack {
  readonly eventBus: events.EventBus;
  readonly alertsTopic: sns.Topic;

  constructor(scope: Construct, id: string, props: SharedStackProps) {
    super(scope, id, props);
    const { config, tables } = props;

    // --- Messaging ---
    this.eventBus = new events.EventBus(this, "EventBus", {
      eventBusName: `${config.appName}-bus`,
    });

    this.alertsTopic = new sns.Topic(this, "AlertsTopic", {
      topicName: `${config.appName}-alerts`,
      displayName: `${config.appName} alerts`,
    });
    if (config.alertEmail) {
      this.alertsTopic.addSubscription(
        new subscriptions.EmailSubscription(config.alertEmail),
      );
    }

    // --- Contact-form email (opt-in; SES sends a one-time verification mail) ---
    if (config.contactEmail) {
      const identity = new ses.EmailIdentity(this, "ContactIdentity", {
        identity: ses.Identity.email(config.contactEmail),
      });
      new cdk.CfnOutput(this, "ContactEmailIdentity", {
        value: identity.emailIdentityName,
      });
    }

    // --- Observability ---
    const alarmAction = new cwActions.SnsAction(this.alertsTopic);

    // Operations the apps + rate limiter actually issue. Scoping the
    // system-errors math expression keeps each alarm under the 10-metric limit.
    const watchedOperations = [
      dynamodb.Operation.GET_ITEM,
      dynamodb.Operation.PUT_ITEM,
      dynamodb.Operation.UPDATE_ITEM,
      dynamodb.Operation.DELETE_ITEM,
      dynamodb.Operation.QUERY,
      dynamodb.Operation.SCAN,
    ];

    // Alarm every table uniformly: a throttle is a capacity signal, a system
    // error is an AWS-side fault — both must page rather than fail silently.
    // (~$0.20/table-month for the two standard alarms; trivial at this scale.)
    for (const table of tables) {
      const key = table.node.id;

      table
        .metric("ThrottledRequests", {
          statistic: "Sum",
          period: cdk.Duration.minutes(5),
        })
        .createAlarm(this, `Throttle-${key}`, {
          alarmName: `${config.appName}-ddb-throttles-${key}`,
          threshold: 1,
          evaluationPeriods: 1,
          comparisonOperator:
            cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
          treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
        })
        .addAlarmAction(alarmAction);

      new cloudwatch.Alarm(this, `SystemErrors-${key}`, {
        alarmName: `${config.appName}-ddb-system-errors-${key}`,
        metric: table.metricSystemErrorsForOperations({
          operations: watchedOperations,
          statistic: "Sum",
          period: cdk.Duration.minutes(5),
        }),
        threshold: 1,
        evaluationPeriods: 1,
        comparisonOperator:
          cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      }).addAlarmAction(alarmAction);
    }

    // Dashboard uses account-scoped SEARCH expressions so it auto-tracks every
    // DynamoDB table (this account is dedicated to the portfolio) without a
    // per-table widget explosion.
    const search = (metricName: string, label: string): cloudwatch.IMetric =>
      new cloudwatch.MathExpression({
        expression: `SEARCH('{AWS/DynamoDB,TableName} MetricName="${metricName}"', 'Sum', 300)`,
        label,
        period: cdk.Duration.minutes(5),
      });

    const dashboard = new cloudwatch.Dashboard(this, "Dashboard", {
      dashboardName: `${config.appName}-overview`,
    });
    dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: "DynamoDB capacity (RCU/WCU, all tables)",
        left: [
          search("ConsumedReadCapacityUnits", "RCU"),
          search("ConsumedWriteCapacityUnits", "WCU"),
        ],
        width: 12,
      }),
      new cloudwatch.GraphWidget({
        title: "DynamoDB throttles & system errors (all tables)",
        left: [
          search("ThrottledRequests", "Throttled"),
          search("SystemErrors", "System errors"),
        ],
        width: 12,
      }),
    );

    // --- Cost budget (publishes to the alerts topic at 80%/100%) ---
    this.alertsTopic.addToResourcePolicy(
      new iam.PolicyStatement({
        principals: [new iam.ServicePrincipal("budgets.amazonaws.com")],
        actions: ["sns:Publish"],
        resources: [this.alertsTopic.topicArn],
      }),
    );

    new budgets.CfnBudget(this, "MonthlyBudget", {
      budget: {
        budgetName: `${config.appName}-monthly`,
        budgetType: "COST",
        timeUnit: "MONTHLY",
        budgetLimit: { amount: config.monthlyBudgetUsd, unit: "USD" },
      },
      notificationsWithSubscribers: [80, 100].map((threshold) => ({
        notification: {
          notificationType: "ACTUAL",
          comparisonOperator: "GREATER_THAN",
          threshold,
          thresholdType: "PERCENTAGE",
        },
        subscribers: [{ subscriptionType: "SNS", address: this.alertsTopic.topicArn }],
      })),
    });

    new cdk.CfnOutput(this, "EventBusName", {
      value: this.eventBus.eventBusName,
    });
    new cdk.CfnOutput(this, "AlertsTopicArn", {
      value: this.alertsTopic.topicArn,
    });
    new cdk.CfnOutput(this, "DashboardName", {
      value: dashboard.dashboardName,
    });
  }
}
