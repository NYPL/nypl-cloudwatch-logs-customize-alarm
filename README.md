# History

This is based on [awslabs/cloudwatch-logs-customize-alarms](https://github.com/awslabs/cloudwatch-logs-customize-alarms) (at revisison c43e22665). The code has been altered to reflect our workflow & to make use of the runtime-environment variables.
The README has changed to reflect those code changes. It doesn't make sense for this app to be a true fork of awslabs/cloudwatch-logs-customize-alarms, given the way that GitHub repo is setup now.

**This README contains much of copy from awslabs/cloudwatch-logs-customize-alarms, but it augmented for how we deploy.**

# CloudWatch Logs Customize Alarms

When you get an alarm, you want enough information to decide whether it needs immediate attention or not. You also want to customize the alarm text to operational needs. The **CloudWatch Logs Customize Alarms** is a Lambda function that helps in reading the logs from CloudWatch Logs during an alarm and send a customized email through SES.

## Flow of Events

![Flow of events](/resources/images/event-flow.png)

## Setup Overview

1. `cp ./config/deploy-env.example.env ./config/[qa|production].env`

2. Fill in appropriate environment variables.

### Pre-requisite

* CloudWatch Logs has a Log group with a metric filter.
* A CloudWatch Alarm is created to trigger when that metric exceeds a threshold.
* SES domain is created and verified

### Triggers

* The Lambda function is triggered on a SNS event.
* You need to provide the SNS topic.

### Authorization

Since there is a need here for various AWS services making calls to each other, appropriate authorization is required.  This takes the form of configuring an IAM role, to which various authorization policies are attached.  This role will be assumed by the Lambda function when running. The below two permissions are required:

1.CloudWatch Logs permits Lambda to call describeMetricFilters and filterLogEvents api. Note that we have given full CloudWatch Logs access, but it is recommended that you only give permissions to call specific api's.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Action": [
        "logs:*"
      ],
      "Effect": "Allow",
      "Resource": "*"
    }
  ]
}
```

2.SES permits Lambda to send a customized email. Note that we have given full SES access, but it is recommended that you only give permissions to send an email.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ses:*"
      ],
      "Resource": "*"
    }
  ]
}
```

### Lambda Function

***Instructions:***

* Handler: The name of the main code file. In this example, we have used index as the name of the handler.
* When the metric (from the logs metric filters) reaches a threshold an alarm is triggered.
* Once Alarm invokes the SNS topic, Lambda function is invoked and it reads the metricName and metricNamespace from the alarm.
* It then calls describeMetricFilters to get the filterPattern.
* Then Lambda calls filterLogEvents to get the relevant logs.
* SES uses those filtered logs and additional customizations to send an email.

### Lambda Configuration

This Lambda function was created with runtime Node.js 4.3. It has been tested with 128 MB and 3 seconds timeout. No VPC was used. You can change the configuration based on your testing.

## Getting started

1. Download the zip file located at dist/customize-alarms.
2. Unzip the file. You will see an index.js file and node_modules folder. Index.js is the Lambda function and node_mdoules contain the specific version of AWS SDK.
3. Open index.js in editor of your choice and add the information as specified in the 'Configuration parameters'.
5. Once done with the changes in Lambda, zip the node.js file and node_modules folder.
6. Upload the zip file to the Lambda function.
7. For ease of use, the index.js is also copied in the main directory here.

## Known Limitation

The Lambda function has the following limitation:
* The nextToken in filterLogEvents api call is ignored. For production use, the lambda function should be modified to query filterLogEvents again with the nextToken received from the previous call. We need to continue querying until we get a null nextToken. More information on the api can be found [here](http://docs.aws.amazon.com/AmazonCloudWatchLogs/latest/APIReference/API_FilterLogEvents.html).

## Copyright

Copyright 2016- Amazon.com, Inc. or its affiliates. All Rights Reserved.
