import { isServer } from "../utils";

const React = require("react")
import "isomorphic-fetch"

const express = require("express")
const ReactDOMServer = require("react-dom/server")
import App from "../client/App"

const app = express()

const port = process.env.PORT ?? 3000

// const clientAppBaseUrl = process.env.CLIENT_APP_BASE_URL ?? 'http://localhost:8080'

// const clientBundleScript =
//   `<script src="${clientAppBaseUrl}/scripts/bundle.js"></script>`;


app.use(express.static('public'))

app.get('*', async (request, response) => {
  let dispatcher = await interceptRequest(request)
  await dispatcher.dispatch(response)
})

async function interceptRequest(request) {
  if (!isServer) {
    throw new Error("Client is not supported YET!")
  }

  let context = new Map()
  let {url, path, query} = request
  let location = {
    url,
    path,
    query,
    match: {}
  }

  let filters = await getRequestFilters(location, request)
  context.set("location", location)

  let dispatcher = {
    request,
    filters,
    context,
    location,
    dispatch,
  };

  return dispatcher

  async function dispatch(response) {
    await applyFilters(request, response, filters, dispatcher)
  }
}

async function getRequestFilters(location, request) {
  return [
    authFilter,
    reactRenderFilter,
  ]
}

async function applyFilters(request, response, filters, dispatcher) {
  for (let i = 0, {length} = filters; i < length; i += 1) {
    console.log(`applying filter with index ${i}`)

    let didProceed = false
    await filters[i](request, response, dispatcher.context, () => didProceed = true)

    console.log(`applied filter ${i}`, didProceed)

    if (!didProceed) {
      return;
    }
  }
}

function reactRenderFilter(request, response, context, next) {
  let {pipe} = ReactDOMServer.renderToPipeableStream(<App context={context}/>, {
    onShellReady() {
      response.setHeader('content-type', 'text/html');
      pipe(response);
    }
  });
}

function authFilter(request, response, context, next) {
  let location = context.get("location")
  if (location.path === "/login" || location.path === "/greeting") {
    context.set("auth", resolveCurrentUser(request))
    next()
    return
  }
  response.status(401)
  response.send()
}

function resolveCurrentUser(request) {
  return {}
}

app.listen(port, () => {
  console.log(`Started listening at http://localhost:${port}`)
})
