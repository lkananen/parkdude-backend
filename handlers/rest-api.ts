import {APIGatewayProxyEvent, Context} from 'aws-lambda';
import {proxy, createServer} from 'aws-serverless-express';
import {createApp} from '../app/app';

export const handler = async (
  event: APIGatewayProxyEvent,
  context: Context
) => {
  const app = await createApp();
  const server = createServer(app);
  return await proxy(server, event, context, 'PROMISE').promise;
};
