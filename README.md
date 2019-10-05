# ParkDude backend

## How to run (development)

There are three possible ways to run development environment: with local express server, with local api gateway or by deploying to aws.

### Common prerequisites
- Node version 10.x (https://nodejs.org/en/)

### Method 1: Local express server

TODO

### Method 2: Local API gateway with SAM

SAM can be used to accurately test API gateway and lambdas. It uses Docker behind the scenes to simulate the gateway. First

Requirements:
- Docker
- Set project directory/drive as shared drive for Docker
- Install [SAM CLI](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/serverless-sam-cli-install.html). Note: Unlike instructions might claim, AWS account is not needed. Only steps 5+ are relevant.

Development:
1. `npm install` (only needed once, or when dependencies are changes)
2. `npm run watch` (compiles code automatically when changed)
3. `npm run sam-api` (generates template.yaml and launches REST API at http://localhost:3000/api)


### Method 3: Deploy to AWS

TODO
1. `npm install` (only needed once, or when dependencies are changes)
2. `npm run synth` (only needed once, or when aws stack configurations are changed)
3. `npm run watch`
4. `npm run deploy` (todo)

