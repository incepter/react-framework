This repository was initialized for an eng meeting explaining how ssr works.

steps:

- `yarn init`
- `yarn add express react react-dom`
- `yarn add -D webpack webpack-cli webpack-dev-server webpack-node-externals @babel/core @babel/preset-env @babel/preset-react babel-loader cross-env nodemon npm-run-all rimraf`
- add `webpack.client.js` with content:
```javascript 
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

```
- add `webpack.server.js` with content:
````javascript
const path = require('path');
const nodeExternals = require('webpack-node-externals');

module.exports = {
  mode: process.env.NODE_ENV === 'production'
    ? 'production'
    : 'development',

  entry: './src/server/index.js',
  target: 'node',
  externals: [nodeExternals()],
  output: {
    path: path.resolve('server-build'),
    filename: 'bundle.js'
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        use: 'babel-loader'
      }
    ]
  }
};

````
- add file: `src/server/index.js` with content:
```javascript
const React = require("react")
const express = require("express")
const ReactDOMServer = require("react-dom/server")
import App from "../client/App"

const app = express()

const port = process.env.PORT ?? 3000
const clientAppBaseUrl = process.env.CLIENT_APP_BASE_URL ?? 'http://localhost:8080'

const clientBundleScript =
  `<script src="${clientAppBaseUrl}/scripts/bundle.js"></script>`; 


app.get('/', (_req, res) => {
  const reactApp = ReactDOMServer.renderToString(<App />);
  return res.send(
    `
      <html>
        <head>
        </head>
        <body>
          <div id="root">${reactApp}</div>
          ${clientBundleScript}
        </body>
      </html>
    `
  );
})

app.listen(port, () => {
  console.log(`Started listening at http://localhost:${port}`)
})

```
- add file: `src/client/index.js` with content:
```javascript
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

ReactDOM.hydrateRoot(
  document.getElementById('root'),
  <App />,
);

```
- add file: `src/client/App.js` with content:
```javascript
import React from "react";

export default function App({name = "me"}) {
  return (
    <div>
      <span>name: {name}</span>
    </div>
  );
}

```
- finally, add these scripts to `package.json`
```json
{
  "scripts" : {
    "clear": "rimraf build",
    "build:server": "webpack --config webpack.server.js",
    "start:server": "node server-build/bundle.js",
    "dev:server": "cross-env npm-run-all -s clear build:server start:server",
    "dev:client": "webpack serve --config webpack.client.js",
    "dev": "npm-run-all --parallel dev:client dev:server"
  }
}
```
- `yarn dev`
