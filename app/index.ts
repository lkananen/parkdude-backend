// Note: Only used in local development

import {createApp} from './app';
import * as path from 'path';
import dotenv = require('dotenv');

// Add environment variables
const configResult = dotenv.config({
  path: path.join(__dirname, '../env/app.dev.env')
});

if (configResult.error) {
  console.error(configResult.error);
  throw new Error('Environment variable configuration failed. Did you add env/app.dev.env file?');
}

const port = process.env.PORT || 3000;

(async () => {
  try {
    const app = await createApp();
    app.listen(port);
    console.log(`Listening on port ${port}.`);
  } catch (error) {
    console.error('Create app failed', error);
  }
})();
