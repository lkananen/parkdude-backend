import { APIGatewayProxyHandler } from "aws-lambda";

export const handler: APIGatewayProxyHandler = async event => {
  console.log("HELLO WORLD!!!", process.env);
  return {
    statusCode: 200,
    body: JSON.stringify(
      {
        message: "Hello world!",
        input: event
      },
      null,
      2
    )
  };
};
