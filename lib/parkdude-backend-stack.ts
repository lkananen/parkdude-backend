import cdk = require('@aws-cdk/core');
import apigateway = require('@aws-cdk/aws-apigateway');
import lambda = require('@aws-cdk/aws-lambda');
import dotenv = require('dotenv');
import fs = require('fs');
import path = require('path');
import ec2 = require('@aws-cdk/aws-ec2');
import rds = require('@aws-cdk/aws-rds');
import {Topic} from '@aws-cdk/aws-sns';
import {LambdaSubscription} from '@aws-cdk/aws-sns-subscriptions';
import {LambdaIntegration} from '@aws-cdk/aws-apigateway';
import {Duration} from '@aws-cdk/core';
import {SubnetType} from '@aws-cdk/aws-ec2';
import {Secret} from '@aws-cdk/aws-secretsmanager';
import {Bucket} from '@aws-cdk/aws-s3';

export class ParkdudeBackendStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const parkdudeVpc = new ec2.Vpc(this, 'ParkdudeVPC', {
      cidr: '10.0.0.0/24', // Total of 2^(32-N) ip addresses in range. E.g. 2^8 = 256.
      maxAzs: 2, // RDS instance requires at least 2
      subnetConfiguration: [
        {
          subnetType: ec2.SubnetType.PUBLIC,
          name: 'Parkdude-Ingress'
        },
        {
          subnetType: ec2.SubnetType.PRIVATE,
          cidrMask: 28,
          name: 'Parkdude-Database'
        }
      ],
      natGateways: 1
    });

    const parkdudeVPCSecGroup = new ec2.SecurityGroup(this, 'ParkdudeVPCSecGroup', {
      vpc: parkdudeVpc,
      allowAllOutbound: false
    });

    parkdudeVPCSecGroup.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(5432),
      'PostgreSQL default inbound port'
    );

    parkdudeVPCSecGroup.addEgressRule(
      ec2.Peer.ipv4('10.0.0.0/24'), // CIDR block for local VPC traffic
      ec2.Port.tcp(5432),
      'PostgreSQL default outbound port'
    );

    parkdudeVPCSecGroup.addEgressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(443),
      'HTTPS default outbound port for Lambda'
    );

    parkdudeVPCSecGroup.addEgressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(80),
      'HTTP default outbound port for Lambda'
    );

    // Automatically creates a password for database.
    // Password must consist of ASCII characters, not including [ /@"']
    const secret = new Secret(this, 'DatabasePassword', {generateSecretString: {excludeCharacters: '/@"\''}});

    // Note! RDS has deletion protection on by default. This means that deleting the
    // related CloudFormation stack doesn't delete the RDS, but instead makes it orphan.
    // This is on to protect user data. Deletions should be made manually.
    const database = new rds.DatabaseInstance(this, 'ParkdudeDBInstance', {
      engine: rds.DatabaseInstanceEngine.POSTGRES,
      instanceClass: ec2.InstanceType.of(ec2.InstanceClass.BURSTABLE3, ec2.InstanceSize.MICRO),
      masterUsername: 'syscdk',
      masterUserPassword: secret.secretValue,
      vpc: parkdudeVpc,
      vpcPlacement: parkdudeVpc.selectSubnets({
        // Defines the public accessability of the DB
        subnetType: SubnetType.PRIVATE
      }),
      securityGroups: [parkdudeVPCSecGroup],
      databaseName: 'ParkdudePSQL'
    });

    const databaseEnv = {
      TYPEORM_HOST: database.dbInstanceEndpointAddress,
      TYPEORM_USERNAME: 'syscdk',
      TYPEORM_PASSWORD: secret.secretValue.toString(),
      TYPEORM_DATABASE: 'ParkdudePSQL',
      TYPEORM_PORT: '5432'
    };

    // Subscription which can be used to launch AsyncSlackBot lambda from slack bot lambda
    const asyncSlackCommandsTopic = new Topic(this, 'AsyncSlackCommandsTopic', {
      displayName: 'Subscription topic for longer Slack command lambdas'
    });

    const restApiHandler = new lambda.Function(this, 'RestApiHandler', {
      runtime: lambda.Runtime.NODEJS_10_X,
      code: lambda.Code.asset('./build/handlers/rest-api'),
      handler: 'lambda.handler',
      environment: {...this.getLambdaEnvironmentVariables(), ...databaseEnv},
      timeout: Duration.seconds(10),
      vpc: parkdudeVpc,
      vpcSubnets: parkdudeVpc.selectSubnets({
        subnetType: SubnetType.PRIVATE
      }),
      securityGroup: parkdudeVPCSecGroup
    });

    const slackBotHandler = new lambda.Function(this, 'SlackBotHandler', {
      runtime: lambda.Runtime.NODEJS_10_X,
      code: lambda.Code.asset('./build/handlers/slack-bot'),
      handler: 'lambda.handler',
      environment: {
        ...this.getLambdaEnvironmentVariables(),
        SLACK_STATUS_LAMBDA_ARN: asyncSlackCommandsTopic.topicArn
      },
      timeout: Duration.seconds(4),
    });

    const asyncSlackBotHandler = new lambda.Function(this, 'AsyncSlackBotHandler', {
      runtime: lambda.Runtime.NODEJS_10_X,
      code: lambda.Code.asset('./build/handlers/async-slack-bot'),
      handler: 'lambda.handler',
      environment: {...this.getLambdaEnvironmentVariables(), ...databaseEnv},
      timeout: Duration.seconds(10),
      vpc: parkdudeVpc,
      vpcSubnets: parkdudeVpc.selectSubnets({
        subnetType: SubnetType.PRIVATE
      }),
      securityGroup: parkdudeVPCSecGroup
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
    const slackApiRoot = restApiRoot.addResource('slack');
    slackApiRoot.addMethod('POST', new LambdaIntegration(slackBotHandler));

    // AsyncSlackBotHandler lambda can only be called from slackBotHandler lambda
    asyncSlackCommandsTopic.addSubscription(new LambdaSubscription(asyncSlackBotHandler));
    asyncSlackCommandsTopic.grantPublish(slackBotHandler);

    new Bucket(this, 'react-frontend-s3', {
      websiteIndexDocument: 'index.html',
      websiteErrorDocument: 'index.html',
      bucketName: 'parkdude',
      publicReadAccess: true
    });
  }

  private getLambdaEnvironmentVariables(): dotenv.DotenvParseOutput {
    // TODO: Handle different environments
    return dotenv.parse(fs.readFileSync(path.join(__dirname, '../env/app.prod.env')));
  }
}

