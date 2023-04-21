import * as React from "react";
import ReactDOM from "react-dom/client";
import {Hydration, useAsyncState} from "react-async-states";

import {
  AsyncState,
  createSource,
  ProducerProps,
  readSource,
  Status
} from "async-states";
import {
  createBrowserRouter,
  createStaticRouter,
  CurrentRouteContextType, OutletBoundary, OutletContext,
  RouterProvider,
  useCurrentRouteContext
} from "./_router";
import {AsyncComponentType} from "./decorators";
import {useSyncExternalStore} from "react";

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


export function useInServer(
  key: string,
  component: AsyncComponentType,
  context: CurrentRouteContextType, // framework context
  extractedComponent,
) {
  if (!isServer) {
    throw new Error("useInServer used in client")
  }

  let {state, source} = useAsyncState({key, producer: limitlessUseProducer}, [key])

  let isInitial = source!.getState().status === Status.initial
  if (isInitial) {
    throw source!.runp(component, context)
  }
  if (state.status === Status.error) {
    throw state.data
  }

  if (state.status !== Status.success) {
    throw new Error("Should not be here")
  }

  return (
    <Hydration context={context}>
      {React.createElement(extractedComponent, state!.data!.props)}
    </Hydration>
  )
}


export function useInClient(
  key: string,
  component: AsyncComponentType,
  context: CurrentRouteContextType, // framework context
  extractedComponent,
) {
  if (isServer) {
    throw new Error("useInClient used in server")
  }

  let {state, read, key: useKey} = useAsyncState({
    key,
    lazy: false,
    producer: limitlessUseProducer,
    skipPendingDelayMs: isServer ? 400 : undefined,
    condition(state) {
      return !isMount.current && computeDidInputsChange(state, context)
    },
    cacheConfig: {
      enabled: !isServer,
      hash: (args) => JSON.stringify(args?.[1]?.params || "root")
    },
  }, [key, context])

  //
  //
  // let didInputsChange = computeDidInputsChange(source.getState()!, context)
  // let didJustHydrate = version === 0 && state.status === Status.success
  //
  // if (didJustHydrate) {
  //   return React.createElement(extractedComponent, lastSuccess!.data?.props)
  // }
  //
  // if (didInputsChange) {
  //   source!.run(component, context)
  // }
  read()

  if (state.status !== Status.success) {
    console.log('state is', key, state, useKey);
    throw new Error("cannot proceed")
  }

  let isMount = React.useRef(true)
  React.useEffect(() => {
    isMount.current = false
  }, [])

  return React.createElement(extractedComponent, state.data.props)
}

function computeDidInputsChange(lastSuccess, context) {
  let prevInputs = lastSuccess!.props?.args! || []
  let previousContext = prevInputs[1]
  let newLocation = context.match.location
  let previousLocation = previousContext?.match.location

  return (
    newLocation.search !== previousLocation?.search ||
    newLocation.pathname !== previousLocation?.pathname
  )
}

export function use(
  key: string,
  component: AsyncComponentType,
  context: CurrentRouteContextType, // framework context
  extractedComponent,
): JSX.Element | null {
  if (isServer) {
    return useInServer(key, component, context, extractedComponent)
  }
  return useInClient(key, component, context, extractedComponent)
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
    <Hydration exclude={(key, state) => state.status !== Status.success} context={context}>
      <UseImpl componentKey={componentKey} component={component}
               context={context} extractedComponent={extractedComponent}/>
    </Hydration>
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
