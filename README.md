# ParkDude backend

## How to run (development)

There are three possible ways to run development environment: with local express server, with local api gateway or by deploying to aws.

### Common prerequisites

- Node version 10.x or newer (https://nodejs.org/en/)
- Database (TODO)

### Method 1: Local express server

Easiest way to run server is to run it as a normal Express server. Do note that this does not work exactly the same as it would with lambdas and API gateway. With this approach it's more important to make sure that application does not rely on any internal state.

Development:

1. `npm install` (only needed once, or when dependencies are changed)
2. `npm run dev` (Launches REST API server at http://localhost:3000, and automatically restarts on code changes)

### Method 2: Local API gateway with SAM

SAM can be used to accurately test API gateway and lambdas. It uses Docker behind the scenes to simulate the gateway. The API calls take slightly longer to run than with method 1, since docker container is started for each request.

Requirements:

- Docker
- Set project directory/drive as shared drive for Docker
- Install [SAM CLI](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/serverless-sam-cli-install.html). Note: Unlike instructions might claim, AWS account is not needed. Only steps 5+ are relevant.

Development:

1. `npm install` (only needed once, or when dependencies are changed)
2. `npm run watch` (compiles code automatically when changed)
3. `npm run sam-api` (generates template.yaml and launches REST API at http://localhost:3000/api)

As long as `watch` and `sam-api` are active, all code changes are applied immediately.

### Method 3: Deploy to AWS

TODO

1. `npm install` (only needed once, or when dependencies are changed)
2. `npm run synth` (only needed once, or when aws stack configurations are changed)
3. `npm run watch`
4. `npm run deploy` (todo)

## Testing

Unit tests are split into two categories: end-to-end (e2e) and unit tests.

End-to-end tests the functionality by calling the server endpoints that are visible to outside world. These tests use a real database to accurately test the functionality. These tests are currently done by calling Express directly, skipping the API gateway completely. New express instance is however created for each test, so functionality should be very similar. All end-to-end tests are in `app/e2e-tests` directory.

Unit tests typically test a single module or a small amount of related modules. These tests should not use real database. Instead all database operations must be mocked. Unit tests should be implemented as such that they can be run parallel if necessary. Unit test files are located in same directory as the module they are testing.

Jest is used to run the tests. Currently Jest always runs both end-to-end and unit tests, but these may be separated later if necessary.

Test commands:

- `npm test` Runs all tests once
- `npm test <filter word>` Runs all test files which contain "\<filter word\>". For example `npm test parking` runs all test files with word "parking".
- `npm run test:watch` Watches for file changes and runs the tests automatically
- `npm run test:coverage` Runs all tests once and calculates code coverage. Output is shown both in console and outputted to `coverage` directory.

## Production deployment

TODO
