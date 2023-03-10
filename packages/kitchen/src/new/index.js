import { isServer } from "../utils";

function loadManifest() {

}

function createDispatcher() {
  let paths = {}
  let filters = []

  return {
    init,
    destroy,
    dispatch,
  }

  function init() {
    filters = collectFilters()
    paths = collectPossibleEndpoints()
  }

  function destroy() {
    paths = null
    filters = null
  }

  async function dispatch(request, response) {
    let resolvedRoutingMeta = computeRoutingMeta(request)

    let context = {
      routing: resolvedRoutingMeta,
    }

    if (isServer) {

    } else {

    }
  }
}

function computeRoutingMeta(request) {
  let {url, path, query} = request
  return {url, path, query, match: matchRequest(request)}
}

function matchRequest(request) {
  return {}
}
