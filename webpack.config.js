const path = require('path');
const nodeExternals = require('webpack-node-externals');
const {
  NODE_ENV = 'production',
} = process.env;

module.exports = {
  entry: './src/index.ts',
  mode: NODE_ENV,
  target: 'node',
  optimization: {
    minimize: false
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'index.js'
  },
  externalsPresets: {
    node: true,

  },
  externals: [],
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: [
          'ts-loader',
        ]
      }
    ]
  },
  resolve: {
    extensions: ['.ts', '.js'],
  }
}