import * as path from 'path';
import dotenv = require('dotenv');

export default () => {
  // Add environment variables
  dotenv.config({
    path: path.join(__dirname, '../../env/app.test.env')
  });
};
