/* eslint-disable @typescript-eslint/no-var-requires */

const path = require('path');
const FilterWarningsPlugin = require('webpack-filter-warnings-plugin');
const webpack = require('webpack');

module.exports = {
  mode: 'production',
  entry: './handlers/rest-api.ts',
  output: {
    filename: 'rest-api.js',
    path: path.resolve(__dirname, 'build/handlers'),
    libraryTarget: 'commonjs'
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
    // TypeORM needs full names
    minimize: false,
  },
  plugins: [
    // Filter TypeORM
    new FilterWarningsPlugin({
      exclude: [/mongodb/, /mssql/, /mysql/, /mysql2/, /oracledb/, /pg-query-stream/, /redis/, /sqlite3/]
    }),
    new webpack.IgnorePlugin(/^pg-native$/)
  ]
};
