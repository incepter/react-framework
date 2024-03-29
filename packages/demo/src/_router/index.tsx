import * as React from "react"


export type Routing = {
  Get: Record<string, { path: string, element: JSX.Element }>,
  Post: Record<string, { path: string, element: JSX.Element }>,
}

export type RoutingTreeElement = {
  path: string,
  config: { path: string, element: JSX.Element },
  children?: Record<string, RoutingTreeElement>,
}

export type RoutingTree = {
  Get: Record<string, RoutingTreeElement>,
  Post: Record<string, RoutingTreeElement>,
}

export type MatchTree = {
  context?: any,
  request?: Request,
  response?: Response,
  location: {
    pathname: string,
    search?: string,
  },
  config: RoutingTreeElement | null,
  matches: Record<string, { match: Record<string, any>, config?: RoutingTreeElement }>
}

function createRoutingTree(routing: Routing): RoutingTree {
  return Object.entries(routing).reduce(
    (result, [method, routes]) => {
      result[method] = createRoutingTreeFromRoutingPart(routes);
      return result;
    },
    {} as RoutingTree
  );
}


export function createBrowserRouter(routing: Routing) {
  let routingTree = createRoutingTree(routing)
  let currentMatch: MatchTree | undefined = routerMatch(window.location.pathname, routingTree.Get);
  if (currentMatch) {
    currentMatch.location.search = window.location.search
    currentMatch.location.pathname = window.location.pathname
  }

  let listenersIndex = 0;
  let liveSubscriptionsIndex = 0;
  let listeners: Record<number, Function> = {};

  function subscribe(cb: Function) {
    let id = ++listenersIndex;
    listeners[id] = cb;
    if (liveSubscriptionsIndex === 0) {
      window.addEventListener("popstate", onRouteChange);
    }
    liveSubscriptionsIndex += 1;
    return () => {
      delete listeners[id]
      liveSubscriptionsIndex -= 1

      if (liveSubscriptionsIndex === 0) {
        window.removeEventListener("popstate", onRouteChange);
      }
    };
  }

  function onRouteChange() {
    currentMatch = routerMatch(window.location.pathname, routingTree.Get);
    if (currentMatch) {
      currentMatch.location.search = window.location.search
      currentMatch.location.pathname = window.location.pathname
    }
    console.log('here change', currentMatch?.location)

    Object.values(listeners).forEach((l) => (l ? l(currentMatch) : undefined));
  }

  return {
    subscribe,
    onRouteChange,
    getCurrent: () => currentMatch,
    match(url, method = "Get") {
      return routerMatch(url, routingTree[method]);
    }
  };
}

export function createStaticRouter(routing: Routing) {
  return function perRequestRouter(request: Request) {
    let {url} = request
    let indexOfQuestionMark = url.indexOf("?")
    let pathname = indexOfQuestionMark > -1 ? url.slice(0, indexOfQuestionMark) : url
    let search = indexOfQuestionMark > -1 ? url.slice(indexOfQuestionMark) : ''
    let routingTree = createRoutingTree(routing)
    let currentMatch: MatchTree | undefined = routerMatch(pathname, routingTree.Get);
    if (currentMatch) {
      currentMatch.location.search = search
      currentMatch.location.pathname = pathname
    }

    return {
      onRouteChange: () => {
      },
      subscribe: () => () => {
      },
      getCurrent: () => currentMatch,
      match(url, method = "Get") {
        return routerMatch(url, routingTree[method]);
      }
    };
  }
}

function createRoutingTreeFromRoutingPart(parts): Record<string, RoutingTreeElement> {
  let result = {};
  for (let [path, config] of Object.entries(parts)) {
    if (path === "/") {
      if (!result["/"]) {
        result["/"] = {};
      }
      result["/"].config = config;
      continue;
    }

    let currentParent = result;
    let pathSegmentsToCheck = path.split("/").filter((t) => t.trim() !== "");

    for (let i = 0, {length} = pathSegmentsToCheck; i < length; i += 1) {
      let isLatest = i === length - 1;
      let segment = pathSegmentsToCheck[i];

      if (!currentParent[segment]) {
        currentParent[segment] = {};
      }

      if (isLatest) {
        currentParent[segment].path = path;
        currentParent[segment].config = config;
      } else {
        if (!currentParent[segment].children) {
          currentParent[segment].children = {};
        }
        currentParent = currentParent[segment].children;
      }
    }
  }
  return result;
}

function routerMatch(
  url: string,
  routingTree: Record<string, RoutingTreeElement>
): MatchTree | undefined {
  if (url === "/" && routingTree["/"]) {
    return {
      location: {pathname: "/"},
      config: routingTree["/"],
      matches: {
        "/": {match: {}, config: routingTree["/"]}
      }
    };
  }

  let cumulativeSegment = "";
  let currentTree = routingTree;

  let matchTree: MatchTree = {
    matches: {},
    config: null,
    location: {pathname: url}
  };

  for (let urlSegment of url.split("/").filter((t) => t.trim() !== "")) {
    if (currentTree[urlSegment]) {
      let config = currentTree[urlSegment].config;
      cumulativeSegment += `/${urlSegment}`;
      if (config) {
        matchTree.matches[cumulativeSegment] = {config: undefined, match: {}};
      }

      if (!matchTree.config) {
        matchTree.config = currentTree[urlSegment]
      }
      currentTree = currentTree[urlSegment].children!;
    } else {
      let firstMatchingFragment;
      Object.entries(currentTree).forEach(
        ([pathFragment, configuredRouting]) => {
          if (pathFragment.startsWith(":")) {
            if (!firstMatchingFragment) {
              firstMatchingFragment = pathFragment;
            }
            if (!matchTree.matches[configuredRouting.path]) {
              matchTree.matches[configuredRouting.path] = {
                config: undefined,
                match: {}
              };
            }
            let propName = pathFragment.slice(1);
            matchTree.matches[configuredRouting.path].match[propName] = urlSegment;
          }
        }
      );
      if (firstMatchingFragment) {
        if (!matchTree.config) {
          matchTree.config = currentTree[firstMatchingFragment]
        }
        matchTree.matches[cumulativeSegment].config = currentTree[firstMatchingFragment];
        currentTree = currentTree[firstMatchingFragment].children!;
        cumulativeSegment += `/${firstMatchingFragment}`;
      }
    }
  }

  return !Object.keys(matchTree.matches).length ? undefined : matchTree;
}

export let RouterContext = React.createContext<ReturnType<typeof createBrowserRouter> | undefined>(undefined);
export let RoutingContext = React.createContext<MatchTree | undefined>(undefined);
export let OutletBoundary = React.createContext<Record<string, RoutingTreeElement> | undefined>(undefined);
export let OutletContext = React.createContext<Record<string, string> | undefined>(undefined);

function renderRootMatch(rootElement: RoutingTreeElement | null) {
  if (!rootElement) {
    console.warn("element root is warn, probably a bug")
    return null;
  }
  let childrenOutlets = rootElement.children;
  if (!childrenOutlets) {
    return rootElement.config.element
  }

  if (rootElement.children && !rootElement.config) {
    return Object.values(rootElement.children).map(t => renderRootMatch(t))
  }

  return (
    <OutletBoundary.Provider key={rootElement.path} value={childrenOutlets}>
      {rootElement.config.element}
    </OutletBoundary.Provider>
  )
}

export function RouterProvider({
  router,
}: { router: ReturnType<typeof createBrowserRouter> }) {
  let match = React.useSyncExternalStore(router.subscribe, router.getCurrent, router.getCurrent)
  let children = React.useMemo(() => match ? renderRootMatch(match!.config) : null, [match])
  if (!match) {
    console.warn("No match from router !")
    return null
  }

  return (
    <RouterContext.Provider value={router}>
      <RoutingContext.Provider value={match}>
        {children}
      </RoutingContext.Provider>
    </RouterContext.Provider>
  )
}

export function Outlet(): any {
  let match = React.useContext(RoutingContext)
  let context = React.useContext(OutletBoundary)


  if (!context) {
    return null
  }

  return Object.values(context).map(config => {
    if (match!.matches[config.path]) {
      return (
        <OutletBoundary.Provider key={config.path} value={config.children}>
          <OutletContext.Provider value={match!.matches[config.path].match}>
            {config.config.element}
          </OutletContext.Provider>
        </OutletBoundary.Provider>
      )
    }

    return null;
  })
}

export function useParams() {
  return React.useContext(OutletContext)!
}

export function useLocation() {
  return React.useContext(RoutingContext)!.location!
}

export function useRouter() {
  return React.useContext(RouterContext)!
}
