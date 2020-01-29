#!/usr/bin/env node
import 'source-map-support/register';
import cdk = require('@aws-cdk/core');
import {SamStack} from '../lib/sam-stack';

const app = new cdk.App();
new SamStack(app, 'SamStack');
