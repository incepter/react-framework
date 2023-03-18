import * as React from "react";
import ReactDOM from "react-dom/client";
import {useAsyncState} from "react-async-states";

import {
  createBrowserRouter,
  RouterProvider,
  useLocation, useParams
} from "react-router-dom"

import {ProducerProps, Status} from "async-states";


type State = {
  status: "initial" | "pending" | "error" | "success",
  data: JSX.Element | null,
  promise?: Promise<JSX.Element>,
}
let initial: State = {
  status: "initial",
  data: null,
}

async function limitlessUseProducer(
  props: ProducerProps<JSX.Element, Error, never, [AsyncComponent, any]>
) {
  let [component, context] = props.args
  return await component(context ?? {})
}

type AsyncComponent = (context: any) => Promise<JSX.Element>

export function use(
  key: string,
  component: AsyncComponent,
  context: any, // framework context
): JSX.Element | null {
  let {source, state, read, lastSuccess} = useAsyncState({
    key,
    resetStateOnDispose: true,
    producer: limitlessUseProducer,
  }, [key])

  if (state.status === Status.initial) {
    throw source!.runp(component, context)
  }

  read() // throws in pending and error
  if (
    lastSuccess &&
    lastSuccess.status === Status.success &&
    React.isValidElement(lastSuccess.data)) {
    return lastSuccess.data
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
  component: AsyncComponent,
}) {
  let params = useParams()
  let location = useLocation()
  let context = React.useMemo(() => ({
    params,
    search: location.search,
    pathname: location.pathname,
  }), [params, location.search, location.pathname])
  return use(componentKey, component, context)
}

export function UseComponent({
  component,
}: {
  component: AsyncComponent,
}) {
  let params = useParams()
  let location = useLocation()
  let context = React.useMemo(() => ({
    params,
    search: location.search,
    pathname: location.pathname,
  }), [params, location])
  return component(context)
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

function getAndBootFilters(config: LimitlessApplicationConfig) {

}

// function run(config: LimitlessApplicationConfig): LimitlessApplication {
//   let filters = getAndBootFilters(config)
//
//   return {
//     filters,
//   }
// }

// type LimitlessContext = {
//   query?: string,
//   request?: Request,
//   response?: Response,
//   body?: ReadableStream<any>,
//   match?: Record<string, string>,
// }
//
// type TT = {
//   getCurrentContext(): LimitlessContext,
//   run(config: LimitlessApplicationConfig): LimitlessApplication,
// }

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
