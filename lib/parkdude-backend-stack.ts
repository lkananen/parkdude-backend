import cdk = require('@aws-cdk/core');
import apigateway = require('@aws-cdk/aws-apigateway');
import lambda = require('@aws-cdk/aws-lambda');
import dotenv = require('dotenv');
import fs = require('fs');
import path = require('path');
import ec2 = require('@aws-cdk/aws-ec2');
import rds = require('@aws-cdk/aws-rds');
import {LambdaIntegration} from '@aws-cdk/aws-apigateway';
import {Duration} from '@aws-cdk/core';
import { SubnetType } from '@aws-cdk/aws-ec2';

export class ParkdudeBackendStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const parkdudeVpc = new ec2.Vpc(this, 'ParkdudeVPC', {
      cidr: "10.0.0.0/24",       // Total of 2^(32-N) ip addresses in range. E.g. 2^6 = 256.
      maxAzs: 2,                 // RDS instance requires at least 2

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
      ]
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

    parkdudeVPCSecGroup.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(443),
      'HTTPS default inbound port for Lambda'
    );

    parkdudeVPCSecGroup.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(80),
      'HTTP default inbound port for Lambda'
    );

    parkdudeVPCSecGroup.addEgressRule(
      ec2.Peer.ipv4("10.0.0.0/24"),         // CIDR block for local VPC traffic
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

    const restApiHandler = new lambda.Function(this, 'RestApiHandler', {
      runtime: lambda.Runtime.NODEJS_10_X,
      code: lambda.Code.asset('./build'),
      handler: 'handlers/rest-api.handler',
      environment: this.getLambdaEnvironmentVariables(),
      timeout: Duration.seconds(10),
      vpc: parkdudeVpc
    });

    const restApi = new apigateway.RestApi(this, 'rest-api', {
      restApiName: 'Parkdude REST API',
      description: 'This service serves widgets.'
    });

    const restApiRoot = restApi.root.addResource('api');
    restApiRoot.addProxy({
      defaultIntegration: new LambdaIntegration(restApiHandler),
      anyMethod: true
    });

    // Note! RDS has deletion protection on by default. This means that deleting the
    // related CloudFormation stack doesn't delete the RDS, but instead makes it orphan.
    // This is on to protect user data. Deletions should be made manually.
    const instance = new rds.DatabaseInstance(this, 'ParkdudeDBInstance', {
      engine: rds.DatabaseInstanceEngine.POSTGRES,
      instanceClass: ec2.InstanceType.of(ec2.InstanceClass.BURSTABLE2, ec2.InstanceSize.MICRO),
      masterUsername: 'syscdk',         // By default the generated password is stored to secrets manager
      vpc: parkdudeVpc,
      vpcPlacement: parkdudeVpc.selectSubnets({
        // Defines the public accessability of the DB
        subnetType: SubnetType.PRIVATE
      }),
      securityGroups: [parkdudeVPCSecGroup],
      databaseName: "ParkdudePSQL"
    });

  }

  private getLambdaEnvironmentVariables(): dotenv.DotenvParseOutput {
    // TODO: Handle different environments
    return dotenv.parse(fs.readFileSync(path.join(__dirname, '../env/app.sam-dev.env')));
  }
}

