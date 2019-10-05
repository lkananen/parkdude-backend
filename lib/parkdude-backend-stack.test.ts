import {
  expect as expectCDK,
  matchTemplate,
  MatchStyle
} from "@aws-cdk/assert";
import cdk = require("@aws-cdk/core");
import ParkdudeBackend = require("./parkdude-backend-stack");

test("Stack should have no new changes", () => {
  const app = new cdk.App();
  const stack = new ParkdudeBackend.ParkdudeBackendStack(app, "MyTestStack");
  // If this changes, verify differences and replace with new one
  expectCDK(stack).to(
    matchTemplate(
      {
        Resources: {
          RestApiHandlerServiceRole04AE0DEA: {
            Type: "AWS::IAM::Role",
            Properties: {
              AssumeRolePolicyDocument: {
                Statement: [
                  {
                    Action: "sts:AssumeRole",
                    Effect: "Allow",
                    Principal: {
                      Service: "lambda.amazonaws.com"
                    }
                  }
                ],
                Version: "2012-10-17"
              },
              ManagedPolicyArns: [
                {
                  "Fn::Join": [
                    "",
                    [
                      "arn:",
                      {
                        Ref: "AWS::Partition"
                      },
                      ":iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
                    ]
                  ]
                }
              ]
            }
          },
          RestApiHandler034BA627: {
            Type: "AWS::Lambda::Function",
            Properties: {
              Code: {
                S3Bucket: {
                  Ref: "RestApiHandlerCodeS3Bucket17DDE020"
                },
                S3Key: {
                  "Fn::Join": [
                    "",
                    [
                      {
                        "Fn::Select": [
                          0,
                          {
                            "Fn::Split": [
                              "||",
                              {
                                Ref: "RestApiHandlerCodeS3VersionKeyE23BA947"
                              }
                            ]
                          }
                        ]
                      },
                      {
                        "Fn::Select": [
                          1,
                          {
                            "Fn::Split": [
                              "||",
                              {
                                Ref: "RestApiHandlerCodeS3VersionKeyE23BA947"
                              }
                            ]
                          }
                        ]
                      }
                    ]
                  ]
                }
              },
              Handler: "handlers/rest-api.handler",
              Role: {
                "Fn::GetAtt": ["RestApiHandlerServiceRole04AE0DEA", "Arn"]
              },
              Runtime: "nodejs10.x"
            },
            DependsOn: ["RestApiHandlerServiceRole04AE0DEA"]
          },
          restapi39D779F7: {
            Type: "AWS::ApiGateway::RestApi",
            Properties: {
              Description: "This service serves widgets.",
              Name: "REST API"
            }
          },
          restapiDeploymentD3722A4Cd376d669d91bc53639869d28107505b4: {
            Type: "AWS::ApiGateway::Deployment",
            Properties: {
              RestApiId: {
                Ref: "restapi39D779F7"
              },
              Description: "Automatically created by the RestApi construct"
            },
            DependsOn: ["restapiANY8BD19244", "restapi955FE7EE"]
          },
          restapiDeploymentStageprod0335F613: {
            Type: "AWS::ApiGateway::Stage",
            Properties: {
              RestApiId: {
                Ref: "restapi39D779F7"
              },
              DeploymentId: {
                Ref: "restapiDeploymentD3722A4Cd376d669d91bc53639869d28107505b4"
              },
              StageName: "prod"
            }
          },
          restapiCloudWatchRole2D9E2F10: {
            Type: "AWS::IAM::Role",
            Properties: {
              AssumeRolePolicyDocument: {
                Statement: [
                  {
                    Action: "sts:AssumeRole",
                    Effect: "Allow",
                    Principal: {
                      Service: "apigateway.amazonaws.com"
                    }
                  }
                ],
                Version: "2012-10-17"
              },
              ManagedPolicyArns: [
                {
                  "Fn::Join": [
                    "",
                    [
                      "arn:",
                      {
                        Ref: "AWS::Partition"
                      },
                      ":iam::aws:policy/service-role/AmazonAPIGatewayPushToCloudWatchLogs"
                    ]
                  ]
                }
              ]
            }
          },
          restapiAccountC2304339: {
            Type: "AWS::ApiGateway::Account",
            Properties: {
              CloudWatchRoleArn: {
                "Fn::GetAtt": ["restapiCloudWatchRole2D9E2F10", "Arn"]
              }
            },
            DependsOn: ["restapi39D779F7"]
          },
          restapi955FE7EE: {
            Type: "AWS::ApiGateway::Resource",
            Properties: {
              ParentId: {
                "Fn::GetAtt": ["restapi39D779F7", "RootResourceId"]
              },
              PathPart: "api",
              RestApiId: {
                Ref: "restapi39D779F7"
              }
            }
          },
          restapiANYApiPermissionMyTestStackrestapiBCB43E74ANYapiDB2D8677: {
            Type: "AWS::Lambda::Permission",
            Properties: {
              Action: "lambda:InvokeFunction",
              FunctionName: {
                "Fn::GetAtt": ["RestApiHandler034BA627", "Arn"]
              },
              Principal: "apigateway.amazonaws.com",
              SourceArn: {
                "Fn::Join": [
                  "",
                  [
                    "arn:",
                    {
                      Ref: "AWS::Partition"
                    },
                    ":execute-api:",
                    {
                      Ref: "AWS::Region"
                    },
                    ":",
                    {
                      Ref: "AWS::AccountId"
                    },
                    ":",
                    {
                      Ref: "restapi39D779F7"
                    },
                    "/",
                    {
                      Ref: "restapiDeploymentStageprod0335F613"
                    },
                    "/*/api"
                  ]
                ]
              }
            }
          },
          restapiANYApiPermissionTestMyTestStackrestapiBCB43E74ANYapiDEC74D65: {
            Type: "AWS::Lambda::Permission",
            Properties: {
              Action: "lambda:InvokeFunction",
              FunctionName: {
                "Fn::GetAtt": ["RestApiHandler034BA627", "Arn"]
              },
              Principal: "apigateway.amazonaws.com",
              SourceArn: {
                "Fn::Join": [
                  "",
                  [
                    "arn:",
                    {
                      Ref: "AWS::Partition"
                    },
                    ":execute-api:",
                    {
                      Ref: "AWS::Region"
                    },
                    ":",
                    {
                      Ref: "AWS::AccountId"
                    },
                    ":",
                    {
                      Ref: "restapi39D779F7"
                    },
                    "/test-invoke-stage/*/api"
                  ]
                ]
              }
            }
          },
          restapiANY8BD19244: {
            Type: "AWS::ApiGateway::Method",
            Properties: {
              HttpMethod: "ANY",
              ResourceId: {
                Ref: "restapi955FE7EE"
              },
              RestApiId: {
                Ref: "restapi39D779F7"
              },
              AuthorizationType: "NONE",
              Integration: {
                IntegrationHttpMethod: "POST",
                Type: "AWS_PROXY",
                Uri: {
                  "Fn::Join": [
                    "",
                    [
                      "arn:",
                      {
                        Ref: "AWS::Partition"
                      },
                      ":apigateway:",
                      {
                        Ref: "AWS::Region"
                      },
                      ":lambda:path/2015-03-31/functions/",
                      {
                        "Fn::GetAtt": ["RestApiHandler034BA627", "Arn"]
                      },
                      "/invocations"
                    ]
                  ]
                }
              }
            }
          }
        },
        Parameters: {
          RestApiHandlerCodeS3Bucket17DDE020: {
            Type: "String",
            Description: 'S3 bucket for asset "MyTestStack/RestApiHandler/Code"'
          },
          RestApiHandlerCodeS3VersionKeyE23BA947: {
            Type: "String",
            Description:
              'S3 key for asset version "MyTestStack/RestApiHandler/Code"'
          },
          RestApiHandlerCodeArtifactHashB622F080: {
            Type: "String",
            Description:
              'Artifact hash for asset "MyTestStack/RestApiHandler/Code"'
          }
        },
        Outputs: {
          restapiEndpointC67DEFEA: {
            Value: {
              "Fn::Join": [
                "",
                [
                  "https://",
                  {
                    Ref: "restapi39D779F7"
                  },
                  ".execute-api.",
                  {
                    Ref: "AWS::Region"
                  },
                  ".",
                  {
                    Ref: "AWS::URLSuffix"
                  },
                  "/",
                  {
                    Ref: "restapiDeploymentStageprod0335F613"
                  },
                  "/"
                ]
              ]
            }
          }
        }
      },
      MatchStyle.EXACT
    )
  );
});
