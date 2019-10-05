import cdk = require("@aws-cdk/core");
import apigateway = require("@aws-cdk/aws-apigateway");
import lambda = require("@aws-cdk/aws-lambda");

export class ParkdudeBackendStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const restApiHandler = new lambda.Function(this, "RestApiHandler", {
      runtime: lambda.Runtime.NODEJS_10_X,
      code: lambda.Code.asset("./build"),
      handler: "handlers/rest-api.handler",
      environment: {}
    });

    const restApi = new apigateway.LambdaRestApi(this, "rest-api", {
      restApiName: "REST API",
      description: "This service serves widgets.",
      handler: restApiHandler,
      proxy: false
    });

    const restApiRoot = restApi.root.addResource("api");
    restApiRoot.addMethod("ANY");

    // TODO: More configurations (e.g. for production)
  }
}
