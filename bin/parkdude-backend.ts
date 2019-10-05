#!/usr/bin/env node
import "source-map-support/register";
import cdk = require("@aws-cdk/core");
import { ParkdudeBackendStack } from "../lib/parkdude-backend-stack";

const app = new cdk.App();
new ParkdudeBackendStack(app, "ParkdudeBackendStack");
