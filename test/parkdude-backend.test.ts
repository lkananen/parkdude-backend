import {
  expect as expectCDK,
  matchTemplate,
  MatchStyle
} from "@aws-cdk/assert";
import cdk = require("@aws-cdk/core");
import ParkdudeBackend = require("../lib/parkdude-backend-stack");

test("Empty Stack", () => {
  const app = new cdk.App();
  // WHEN
  const stack = new ParkdudeBackend.ParkdudeBackendStack(app, "MyTestStack");
  // THEN
  expectCDK(stack).to(
    matchTemplate(
      {
        Resources: {}
      },
      MatchStyle.EXACT
    )
  );
});
