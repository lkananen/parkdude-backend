import {APIGatewayProxyEvent, Context} from 'aws-lambda';
import {proxy, createServer} from 'aws-serverless-express';
import {createApp} from '../app/app';

// AWS lambdas can reuse execution context, which is why app is defined here for
// optimisation purposes
// https://docs.aws.amazon.com/lambda/latest/dg/running-lambda-code.html
const appPromise = createApp();
const serverPromise = (async () => createServer(await appPromise))();

export const handler = async (
  event: APIGatewayProxyEvent,
  context: Context
) => {
  // Makes it so that lambda does not get stuck waiting for db connections to close
  context.callbackWaitsForEmptyEventLoop = false;

  const server = await serverPromise;
  return await proxy(server, event, context, 'PROMISE').promise;
};
