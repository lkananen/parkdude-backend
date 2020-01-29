import cdk = require('@aws-cdk/core');
import apigateway = require('@aws-cdk/aws-apigateway');
import lambda = require('@aws-cdk/aws-lambda');
import dotenv = require('dotenv');
import fs = require('fs');
import path = require('path');
import {LambdaIntegration} from '@aws-cdk/aws-apigateway';
import {Duration} from '@aws-cdk/core';

/**
 * Same as ParkdudeBackendStack, but only with REST API.
 * Is used to run API gateway locally with SAM.
 */
export class SamStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const lambdaEnvironmentVariables = this.getLambdaEnvironmentVariables();

    const restApiHandler = new lambda.Function(this, 'RestApiHandler', {
      runtime: lambda.Runtime.NODEJS_10_X,
      code: lambda.Code.asset('./build/handlers/rest-api'),
      handler: 'lambda.handler',
      environment: lambdaEnvironmentVariables,
      timeout: Duration.seconds(60)
    });

    const restApi = new apigateway.RestApi(this, 'rest-api', {
      restApiName: 'Parkdude REST API',
      description: 'REST API for Parkdude application'
    });

    const restApiRoot = restApi.root.addResource('api');
    restApiRoot.addProxy({
      defaultIntegration: new LambdaIntegration(restApiHandler),
      anyMethod: true
    });
  }

  private getLambdaEnvironmentVariables(): dotenv.DotenvParseOutput {
    return dotenv.parse(fs.readFileSync(path.join(__dirname, '../env/app.sam-dev.env')));
  }
}
