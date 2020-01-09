import {SNSEvent, Context} from 'aws-lambda';
import {createConnection} from 'typeorm';
import {entities} from '../app/entities';
import * as axios from 'axios';
import {processSlackCommand} from '../app/services/slack.service';

// Reuse same connection across lambda runs
const connectionPromise = createConnection({
  type: 'postgres',
  host: process.env.TYPEORM_HOST,
  username: process.env.TYPEORM_USERNAME,
  password: process.env.TYPEORM_PASSWORD,
  database: process.env.TYPEORM_DATABASE,
  port: process.env.TYPEORM_PORT ? +process.env.TYPEORM_PORT : 5432,
  migrationsRun: false,
  synchronize: false,
  logging: process.env.TYPEORM_LOGGING == 'true',
  entities
});

/**
 * Lambda that handles longer Slack bot tasks that require database access.
 * These operations are started from normal SlackBot lambda and can last longer than
 * the 3 seconds normally allowed by Slack.
 * Responses are sent by sending the data to provided Slack url.
 */
export const handler = async (
  event: SNSEvent,
  context: Context
) => {
  context.callbackWaitsForEmptyEventLoop = false;
  await connectionPromise;
  const data = JSON.parse(event.Records[0].Sns.Message);
  const responseJson = await processSlackCommand(data.text);
  await axios.default.post(data.url, responseJson).catch((err) => {
    console.error('Slack response failed', err);
  });
};
