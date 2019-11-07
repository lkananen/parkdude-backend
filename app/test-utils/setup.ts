import * as path from 'path';
import dotenv = require('dotenv');

export default () => {
  // Add environment variables
  dotenv.config({
    path: path.join(__dirname, '../../env/app.test.env')
  });
  // Show bigger objects in console logs (including supertest diffs)
  require('util').inspect.defaultOptions.depth = 20;
};
