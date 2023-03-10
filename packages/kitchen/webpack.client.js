const path = require('path');
const nodeExternals = require('webpack-node-externals');

const clientPort = 8080;

module.exports = {
  mode: process.env.NODE_ENV === 'production'
    ? 'production'
    : 'development',

  target: 'web',

  entry: './src/client/index.js',

  module: {
    rules: [
      { 
        test: /\.js?$/,
        loader: 'babel-loader',
        exclude: /node_modules/,
      },
    ],
  },

  output: {
    path: path.join(__dirname, './build/client'), 
    filename: 'scripts/bundle.js', 
    publicPath: `http://localhost:${clientPort}/`, // [C]
  },

  devServer: {
    port: clientPort, // [C]
    liveReload: true
  },
};
