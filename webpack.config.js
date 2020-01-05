/* eslint-disable @typescript-eslint/no-var-requires */

const path = require('path');
const FilterWarningsPlugin = require('webpack-filter-warnings-plugin');
const webpack = require('webpack');

module.exports = {
  mode: 'development',
  entry: {
    'rest-api/lambda': './handlers/rest-api.ts',
    'slack-bot/lambda': './handlers/slack-bot.ts',
    'async-slack-bot/lambda': './handlers/async-slack-bot.ts'
  },
  output: {
    path: path.resolve(__dirname, 'build/handlers'),
    libraryTarget: 'commonjs',
    pathinfo: false
  },
  resolve: {
    extensions: ['.ts', '.js']
  },
  module: {
    rules: [{
      test: /\.ts$/,
      use: [
        {
          loader: 'ts-loader',
          options: {
            transpileOnly: true
          }
        }
      ]
    }]
  },
  target: 'node',
  optimization: {
  stats: {
    warningsFilter: /^(?!CriticalDependenciesWarning$)/
  },
  plugins: [
    // Filter TypeORM
    new FilterWarningsPlugin({
      exclude: [
        /mongodb/, /mssql/, /mysql/, /mysql2/, /oracledb/, /pg-query-stream/,
        /redis/, /sqlite3/, /react-native/
      ]
    }),
    new webpack.IgnorePlugin(/^pg-native$/)
  ],
  externals: {
    'aws-sdk': 'aws-sdk'
  }
};
