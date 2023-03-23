import * as React from "react";
import ReactDOM from "react-dom/client";
import {Hydration, useAsyncState} from "react-async-states";

import {ProducerProps, Status} from "async-states";
import {
  createBrowserRouter, createStaticRouter,
  RouterProvider,
  useLocation,
  useParams
} from "./_router";
import {AsyncComponentType, ComponentType} from "./decorators";

async function limitlessUseProducer(
  props: ProducerProps<JSX.Element, Error, never, [AsyncComponentType, any]>
) {
  let [component, context] = props.args
  return await component(context ?? {})
}

export function use(
  key: string,
  component: AsyncComponentType,
  context: any, // framework context
): JSX.Element | null {
  let {source, state, read, lastSuccess, version} = useAsyncState({
    key,
    // resetStateOnDispose: true,
    producer: limitlessUseProducer,
  }, [key])

  let isInitial = state.status === Status.initial
  let didSucceed = lastSuccess?.status === Status.success

  if (isInitial) {
    throw source!.runp(component, context)
  } else {
    let prevInputs = lastSuccess!.props?.args!
    let newContextEntries = Object.values(context)
    let prevContextEntries = Object.values(prevInputs[1] || {})

    let didInputsChange = prevInputs[0] !== component
    if (newContextEntries.length !== prevContextEntries.length) {
      didInputsChange = true
    }

    for (let i = 0; i < prevContextEntries.length; i += 1) {
      // @ts-ignore
      if (newContextEntries[i] !== prevContextEntries[i]) {
        didInputsChange = true
        break;
      }
    }

    if (didInputsChange) {
      throw source!.runp(component, context)
    }
  }

  let isInIncompleteHydration = state.status === Status.pending && version === 0
  if (isInIncompleteHydration) {
    throw new Error("Incomplete hydration state")
  }
  read() // throws in pending and error

  if (didSucceed && React.isValidElement(lastSuccess!.data)) {
    return lastSuccess!.data
  }
  throw new Error("Should not be here");
}

export function SuspenseWrapper({children, fallback}) {
  return (
    <React.Suspense fallback={fallback}>
      {children}
    </React.Suspense>
  )
}

export function UseAsyncComponent({
  componentKey,
  component,
}: {
  componentKey: string,
  component: AsyncComponentType,
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

  return use(componentKey, component, context)
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
          <Hydration context={request}>
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
