/* eslint-disable linebreak-style */
/* eslint-disable indent */
import {
    expect as expectCDK,
    matchTemplate,
    MatchStyle
  } from '@aws-cdk/assert';
  import cdk = require('@aws-cdk/core');
  import ParkdudeBackend = require('./parkdude-backend-stack');
  import {
      SynthUtils
    } from '@aws-cdk/assert';

  test('Stack should be creatable', () => {
    const app = new cdk.App();
    const stack = new ParkdudeBackend.ParkdudeBackendStack(app, 'MyTestStack');

    // Test that the stack generates valid CloudFormation
    const cfStack = SynthUtils.toCloudFormation(stack);
    expect(cfStack).toBeDefined();

    // Test that the stack can be syntesized
    const cfArtifact = SynthUtils.synthesize(stack);
    expect(cfArtifact).toBeDefined();
  });
