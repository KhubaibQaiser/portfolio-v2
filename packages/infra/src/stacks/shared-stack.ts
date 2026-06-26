import * as cdk from "aws-cdk-lib";
import * as budgets from "aws-cdk-lib/aws-budgets";
import * as cloudwatch from "aws-cdk-lib/aws-cloudwatch";
import * as cwActions from "aws-cdk-lib/aws-cloudwatch-actions";
import * as events from "aws-cdk-lib/aws-events";
import * as iam from "aws-cdk-lib/aws-iam";
import * as ses from "aws-cdk-lib/aws-ses";
import * as sns from "aws-cdk-lib/aws-sns";
import * as subscriptions from "aws-cdk-lib/aws-sns-subscriptions";
import type { Construct } from "constructs";
import type { InfraConfig } from "../config";
import { appErrorMetric } from "../naming";

export type SharedStackProps = cdk.StackProps & {
  config: InfraConfig;
};

/**
 * Shared platform services that cut across the apps and share the same
 * lifecycle, region, and owner:
 *  - an EventBridge bus for domain events (decoupled revalidation/automation)
 *  - an SNS alerts topic (CloudWatch alarms + AWS Budgets fan out to email)
 *  - a SES email identity for the contact form (when configured)
 *  - a monthly cost budget, a single application-error alarm, and a dashboard
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
    const { config } = props;

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
    // Cost-driven design (ADR 0002): a single application-error alarm replaces
    // per-table DynamoDB alarms. CloudWatch bills alarms per referenced metric,
    // and metric-math alarms multiply that — 18 per-table alarms (9 of them
    // 6-metric math) cost ~$6.30/mo. Any DynamoDB/S3/AI fault that matters
    // surfaces as a logged `ERROR` in the app, which the apps' metric filters
    // roll up into one `AppErrors` metric — so we alarm on the user-facing
    // symptom for ~$0.10/mo instead. The dashboard (one of 3 free) still shows
    // DynamoDB via account-scoped SEARCH (no per-table cost).
    const alarmAction = new cwActions.SnsAction(this.alertsTopic);
    const period = cdk.Duration.minutes(5);

    const errorMetric = appErrorMetric(config);
    new cloudwatch.Alarm(this, "AppErrorsAlarm", {
      alarmName: `${config.appName}-app-errors`,
      alarmDescription:
        "Application logged one or more ERROR lines (web or admin server function).",
      metric: new cloudwatch.Metric({
        namespace: errorMetric.namespace,
        metricName: errorMetric.metricName,
        statistic: "Sum",
        period,
      }),
      threshold: 1,
      evaluationPeriods: 1,
      comparisonOperator:
        cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    }).addAlarmAction(alarmAction);

    // Dashboard uses account-scoped SEARCH expressions so it auto-tracks every
    // DynamoDB table (this account is dedicated to the portfolio) without a
    // per-table widget — or per-metric alarm — cost.
    const search = (
      namespace: string,
      metricName: string,
      label: string,
    ): cloudwatch.IMetric =>
      new cloudwatch.MathExpression({
        expression: `SEARCH('{${namespace},TableName} MetricName="${metricName}"', 'Sum', 300)`,
        label,
        period,
      });

    const dashboard = new cloudwatch.Dashboard(this, "Dashboard", {
      dashboardName: `${config.appName}-overview`,
    });
    dashboard.addWidgets(
      new cloudwatch.SingleValueWidget({
        title: "Application errors (sum, 5m)",
        metrics: [
          new cloudwatch.Metric({
            namespace: errorMetric.namespace,
            metricName: errorMetric.metricName,
            statistic: "Sum",
            period,
          }),
        ],
        width: 24,
      }),
      new cloudwatch.GraphWidget({
        title: "DynamoDB capacity (RCU/WCU, all tables)",
        left: [
          search("AWS/DynamoDB", "ConsumedReadCapacityUnits", "RCU"),
          search("AWS/DynamoDB", "ConsumedWriteCapacityUnits", "WCU"),
        ],
        width: 12,
      }),
      new cloudwatch.GraphWidget({
        title: "DynamoDB throttles & system errors (all tables)",
        left: [
          search("AWS/DynamoDB", "ThrottledRequests", "Throttled"),
          search("AWS/DynamoDB", "SystemErrors", "System errors"),
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
