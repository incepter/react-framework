import * as React from "react";
import ReactDOM from "react-dom/client";
import {Hydration, useAsyncState} from "react-async-states";

import {ProducerProps, Status} from "async-states";
import {
  createBrowserRouter,
  createStaticRouter,
  CurrentRouteContextType, OutletBoundary, OutletContext,
  RouterProvider,
  useCurrentRouteContext
} from "./_router";
import {AsyncComponentType} from "./decorators";

async function limitlessUseProducer(
  props: ProducerProps<JSX.Element, Error, never, [AsyncComponentType, CurrentRouteContextType]>
) {
  let [component, context] = props.args
  let element = await component(context)
  if (isServer) {
    return {type: element.type, props: element.props} as JSX.Element
  }
  return element
}

export let __DEV__ = process.env.NODE_ENV !== "production";
export let maybeWindow = typeof window !== "undefined" ? window : undefined;
export let isServer = typeof maybeWindow === "undefined" ||
  !maybeWindow.document ||
  !maybeWindow.document.createElement;


export function use(
  key: string,
  component: AsyncComponentType,
  context: CurrentRouteContextType, // framework context
  extractedComponent,
): JSX.Element | null {
  let ref = React.useRef(0)
  ++ref.current
  let {source, state, read, lastSuccess, version} = useAsyncState({
    key,
    // resetStateOnDispose: true,
    producer: limitlessUseProducer,
  }, [key])

  let didSucceed = lastSuccess?.status === Status.success
  let isInitial = source!.getState().status === Status.initial
  let didJustLoadFromHydration = !isInitial && version === 0

  let currentMatch = React.useContext(OutletBoundary)

  if (!isServer) {
    let isInIncompleteHydration = state.status === Status.pending && version === 0

    if (isInIncompleteHydration) {
      throw new Error("Incomplete hydration state")
    }
  }

  if (isInitial) {
    console.log('running', key, source!.getState(), version, ref.current)
    throw source!.runp(component, context);
  } else {
    let prevInputs = lastSuccess!.props?.args! || []

    if (!prevInputs && didJustLoadFromHydration) {
      return React.createElement(extractedComponent, lastSuccess?.data?.props)
    }

    let previousContext = prevInputs[1]
    let newLocation = context.match.location
    let previousLocation = previousContext.match.location

    if (newLocation.search !== previousLocation.search ||
      newLocation.pathname !== previousLocation.pathname) {
      console.log('running2', currentMatch, key, newLocation.search, previousLocation.search, newLocation.pathname, previousLocation.pathname, previousContext.params, context.params)
      throw source!.runp(component, context)
    }

    if (didJustLoadFromHydration) {
      return React.createElement(extractedComponent, lastSuccess?.data?.props)
    }
  }

  read() // throws in pending and error

  if (didJustLoadFromHydration) {
    return React.createElement(extractedComponent, lastSuccess?.data?.props)
  }

  if (didSucceed) {
    if (isServer) {
      return (
        <Hydration context={context}>
          {React.createElement(lastSuccess!.data!.type, lastSuccess!.data!.props)}
        </Hydration>
      )
    }
    return lastSuccess!.data!
  }
  throw new Error("Should not be here");
}

function UseImpl({
  componentKey,
  component,
  context,
  extractedComponent,
}) {
  return use(componentKey, component, context, extractedComponent)
}

export function SuspenseWrapper({children, fallback}) {
  return (
    <React.Suspense fallback={fallback}>
      {children}
    </React.Suspense>
  )
}

let staticObject = {}

export function UseAsyncComponent({
  componentKey,
  component,
  extractedComponent,
}: {
  componentKey: string,
  component: AsyncComponentType,
  extractedComponent: any
}) {
  let context = useCurrentRouteContext()
  return (
    <UseImpl componentKey={componentKey} component={component}
             context={context} extractedComponent={extractedComponent}/>
  )
}


type AppRoutes = {}
type LimitlessApplicationConfig = {
  filters: any[],
  routes: AppRoutes,
  type: "csr" | "ssr" | "src",
}

type LimitlessFilter = {}
type LimitlessApplication = {
  // getBean<T>(name: string): T,
  // hasBean(name: string): boolean,
  // requestBean<T>(name: string): T,

  filters: LimitlessFilter[],

}

export function Application({children}) {
  return (
    <React.Suspense fallback="Loading...">
      {children}
    </React.Suspense>
  )
}


export function RunCSRApp(routing) {
  let router = createBrowserRouter(routing)

  ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
    <React.StrictMode>
      <Application>
        <RouterProvider router={router}/>
      </Application>
    </React.StrictMode>
  )
}

export function RunSSRApp(routing) {
  let router = createStaticRouter(routing)
  return function interceptRequest(request) {
    let requestRouter = router(request)
    return (
      <html>
      <head>
        <meta charSet="utf-8"/>
        <meta name="viewport" content="width=device-width, initial-scale=1"/>
        <title>My app</title>
      </head>
      <body>
      <div id="root">
        <React.StrictMode>
          <Hydration context={isServer ? request : staticObject}>
            <Application>
              <RouterProvider router={requestRouter}/>
            </Application>
          </Hydration>
        </React.StrictMode>
      </div>
      </body>
      </html>
    )
  }
}

export function renderClientApp(routing) {
  let router = createBrowserRouter(routing)
  return (
    <React.StrictMode>
      <Application>
        <RouterProvider router={router}/>
      </Application>
    </React.StrictMode>
  )
}

export function renderRouteSync(name: string, Component: React.FC<any>) {
  let context = useCurrentRouteContext()
  return React.createElement(Component, context)
}

export function renderRouteAsync(
  name: string,
  AsyncComponent: AsyncComponentType,
  SyncComponent: React.FC<any>
) {
  return (
    <UseAsyncComponent
      componentKey={name}
      component={AsyncComponent}
      extractedComponent={SyncComponent}
    />
  )
}
