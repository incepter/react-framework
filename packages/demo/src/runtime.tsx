import * as React from "react";
import ReactDOM from "react-dom/client";
import {Hydration, useAsyncState} from "react-async-states";

import {ProducerProps, Status} from "async-states";
import {
  createBrowserRouter,
  createStaticRouter,
  RouterProvider,
  useLocation,
  useParams
} from "./_router";
import {AsyncComponentType, ComponentType} from "./decorators";

async function limitlessUseProducer(
  props: ProducerProps<JSX.Element, Error, never, [AsyncComponentType, any]>
) {
  let [component, context] = props.args
  let element = await component(context ?? {})
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
  context: any, // framework context
  extractedComponent,
): JSX.Element | null {
  let {source, state, read, lastSuccess, version} = useAsyncState({
    key,
    // resetStateOnDispose: true,
    producer: limitlessUseProducer,
  }, [key])


  let didSucceed = lastSuccess?.status === Status.success
  let isInitial = source!.getState().status === Status.initial
  let didJustLoadFromHydration = !isInitial && version === 0
  let isInIncompleteHydration = state.status === Status.pending && version === 0

  if (isInIncompleteHydration) {
    throw new Error("Incomplete hydration state")
  }
  if (isInitial) {
    throw source!.runp(component, context);
  } else {
    let newContextEntries = Object.values(context)
    let prevInputs = lastSuccess!.props?.args! || []
    let prevContextEntries = Object.values(prevInputs[1] || {})

    let didInputsChange = false

    if (newContextEntries.length !== prevContextEntries.length) {
      didInputsChange = true
    } else {
      for (let i = 0; i < prevContextEntries.length; i += 1) {
        if (newContextEntries[i] !== prevContextEntries[i]) {
          didInputsChange = true
          break;
        }
      }
    }

    if (didInputsChange) {
      throw source!.runp(component, context)
    } else if (didJustLoadFromHydration) {
      return React.createElement(extractedComponent, lastSuccess?.data?.props)
    }

    didInputsChange = (didInputsChange && prevInputs[0] !== component)

    if (didInputsChange) {
      throw source!.runp(component, context)
    }
  }

  read() // throws in pending and error

  if (didJustLoadFromHydration) {
    return React.createElement(extractedComponent, lastSuccess?.data?.props)
  }

  if (didSucceed) {
    if (isServer) {
      return (
        <Hydration context={isServer ? context : staticObject}>
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
  let params = useParams()
  let location = useLocation()

  let context = React.useMemo(() => ({
    params,
    body: undefined,
    context: undefined,
    search: location.search,
    pathname: location.pathname,
  }), [params, location.pathname, location.search])

  return (
    <Hydration context={isServer ? context : staticObject}>
      <UseImpl componentKey={componentKey} component={component}
               context={context} extractedComponent={extractedComponent}/>
    </Hydration>
  )
}


export function UseComponent({
  component,
}: {
  component: ComponentType,
}) {
  let params = useParams()
  let location = useLocation()

  let context = React.useMemo(() => ({
    params,
    body: undefined,
    context: undefined,
    search: location.search,
    pathname: location.pathname,
  }), [params, location])

  return React.createElement(component, context)
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
