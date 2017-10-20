import aws from 'aws-sdk';

const cwl = new aws.CloudWatchLogs();
const ses = new aws.SES();

exports.handler = (event, context) => {
  console.log('Event in main exports.handler: ', event);

  const message = JSON.parse(event.Records[0].Sns.Message);
  const alarmName = message.AlarmName;
  const oldState = message.OldStateValue;
  const newState = message.NewStateValue;
  const reason = message.NewStateReason;
  const requestParams = {
    metricName: message.Trigger.MetricName,
    metricNamespace: message.Trigger.Namespace
  };

  cwl.describeMetricFilters(requestParams, (err, data) => {
      if(err) {
        console.log('Error is:', err);
      } else {
        console.log('Metric Filter data is:', data);
        getLogsAndSendEmail(message, data);
      }
  });
};

const getLogsAndSendEmail = (message, metricFilterData) => {
    const timestamp = Date.parse(message.StateChangeTime);
    const offset = message.Trigger.Period * message.Trigger.EvaluationPeriods * 1000;
    const metricFilter = metricFilterData.metricFilters[0];
    const parameters = {
      'logGroupName' : metricFilter.logGroupName,
      'filterPattern' : metricFilter.filterPattern ? metricFilter.filterPattern : "",
      'startTime' : timestamp - offset,
      'endTime' : timestamp
    };

    cwl.filterLogEvents(parameters, (err, data) => {
      if (err) {
        console.log('Filtering failure:', err);
      } else {
        console.log("===SENDING EMAIL===");

        const email = ses.sendEmail(generateEmailContent(data, message), function(err, data) {
          if(err) {
            console.log(err);
          } else {
            console.log("===EMAIL SENT===");
            console.log(data);
          }
        });
      }
    });
}

const generateEmailContent = (data, message) => {
  const events = data.events;
  console.log('Events are:', events);

  const style = '<style> pre {color: red;} </style>';
  let logData = '<br/>Logs:<br/>' + style;

  for (var i in events) {
    logData += `<pre>Instance: ${JSON.stringify(events[i]['logStreamName'])}</pre>`;
    logData += `<pre>Message: ${JSON.stringify(events[i]['message'])}</pre><br/>`;
  }

  const date = new Date(message.StateChangeTime);
  const subject = 'Details for Alarm - ' + message.AlarmName;
  const text = 'Alarm Name: ' + '<b>' + message.AlarmName + '</b><br/>' +
   'Account ID: ' + message.AWSAccountId + '<br/>' +
   'Region: ' + message.Region + '<br/>' +
   'Alarm Time: ' + date.toString() + '<br/>' + logData;

  const emailContent = {
    Destination: {
      ToAddresses: process.env.TO_ADDRESSES.split(",").map(address => address.trim())
    },
    Message: {
      Body: {
        Html: {
          Data: text
        }
      },
      Subject: {
        Data: subject
      }
    },
    Source: process.env.FROM_ADDRESS
  };

  return emailContent;
}
