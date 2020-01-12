import {APIGatewayProxyEvent, Context} from 'aws-lambda';
import {validateSlackAuth, SlackCommand, processSlackCommand} from '../app/services/slack.service';
import {SlackAuthenticationError} from '../app/utils/errors';
import qs from 'qs';
// eslint-disable-next-line node/no-extraneous-import
import {SNS} from 'aws-sdk';

/**
 * Lambda function that handles Slack commands.
 * All short commands it handles directly by responding to requests.
 * Longer ones it passes on for AsyncSlackBot lambda to avoid issues with Slack's
 * 3 second timeout.
 */
export const handler = async (
  event: APIGatewayProxyEvent,
  context: Context
) => {
  try {
    // Verify that request originates from Slack
    validateSlackAuth(event);
  } catch (err) {
    // 200 status code used so that Slack accepts the response
    console.log('Slack authentication error', err);
    return {
      statusCode: 200,
      body: JSON.stringify({
        'response_type': 'ephemeral',
        'text': err instanceof SlackAuthenticationError ?
          err.message :
          'Slack authentication failed for unknown reason. Contact application administrator.'
      })
    };
  }

  const body = qs.parse(event.body!!);
  const command = body.text.split(' ')[0];

  if (command !== SlackCommand.STATUS) {
    // All other responses can be responded to immediately (= without db connection)
    const responseJson = await processSlackCommand(body.text);
    return {
      statusCode: 200,
      body: JSON.stringify(responseJson)
    };
  }

  // Commands that require database connection should reply immediately and send the
  // real response as delayed message to avoid Slack's 3 second timeout on cold starts
  try {
    const sns = new SNS();
    // Starts new lambda asynchronously, independently from this one.
    // The lambda will do real execution which will send the final response, which can be
    // after the 3 second timeout
    await sns.publish({
      TopicArn: process.env.SLACK_STATUS_LAMBDA_ARN,
      Message: JSON.stringify({
        text: body.text,
        url: body.response_url
      })
    }).promise();
  } catch (err) {
    return {
      statusCode: 200,
      body: JSON.stringify({
        'response_type': 'ephemeral',
        'text': 'Error in triggering status command. Contact application administrator.'
      })
    };
  }

  // Acknowledge that request has been received. This prevents Slack from giving 3 second
  // timeout warning.
  // The previously started lambda will give final output later.
  return {
    statusCode: 200,
    body: ''
  };
};
