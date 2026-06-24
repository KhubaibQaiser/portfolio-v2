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
  /** Content table to alarm on (from the DataStack). */
  table: dynamodb.ITable;
};

/**
 * Shared platform services that cut across the apps and share the same
 * lifecycle, region, and owner:
 *  - an EventBridge bus for domain events (decoupled revalidation/automation)
 *  - an SNS alerts topic (CloudWatch alarms + AWS Budgets fan out to email)
 *  - a SES email identity for the contact form (when configured)
 *  - a monthly cost budget, DynamoDB alarms, and an overview dashboard
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
    const { config, table } = props;

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

    // The operations the app performs (ElectroDB + rate limiter). Scoping the
    // system-errors math expression keeps it under the 10-metric alarm limit.
    const watchedOperations = [
      dynamodb.Operation.GET_ITEM,
      dynamodb.Operation.PUT_ITEM,
      dynamodb.Operation.UPDATE_ITEM,
      dynamodb.Operation.DELETE_ITEM,
      dynamodb.Operation.QUERY,
      dynamodb.Operation.BATCH_GET_ITEM,
      dynamodb.Operation.BATCH_WRITE_ITEM,
    ];

    const throttleAlarm = table
      .metric("ThrottledRequests", {
        statistic: "Sum",
        period: cdk.Duration.minutes(5),
      })
      .createAlarm(this, "TableThrottleAlarm", {
        alarmName: `${config.appName}-ddb-throttles`,
        threshold: 1,
        evaluationPeriods: 1,
        comparisonOperator:
          cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      });
    throttleAlarm.addAlarmAction(alarmAction);

    const systemErrorsAlarm = new cloudwatch.Alarm(this, "TableSystemErrorsAlarm", {
      alarmName: `${config.appName}-ddb-system-errors`,
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
    });
    systemErrorsAlarm.addAlarmAction(alarmAction);

    const dashboard = new cloudwatch.Dashboard(this, "Dashboard", {
      dashboardName: `${config.appName}-overview`,
    });
    dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: "DynamoDB capacity (RCU/WCU)",
        left: [
          table.metricConsumedReadCapacityUnits(),
          table.metricConsumedWriteCapacityUnits(),
        ],
        width: 12,
      }),
      new cloudwatch.GraphWidget({
        title: "DynamoDB throttles & errors",
        left: [
          table.metric("ThrottledRequests", { statistic: "Sum" }),
          table.metricSystemErrorsForOperations({
            operations: watchedOperations,
            statistic: "Sum",
          }),
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
