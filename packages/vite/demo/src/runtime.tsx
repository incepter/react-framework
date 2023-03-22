import * as React from "react";
import ReactDOM from "react-dom/client";
import {useAsyncState} from "react-async-states";

import {ProducerProps, Status} from "async-states";
import {
  createBrowserRouter,
  RouterProvider,
  useLocation,
  useParams
} from "./_router";
import {AsyncComponentType, ComponentType} from "./decorators";


type State = {
  status: "initial" | "pending" | "error" | "success",
  data: JSX.Element | null,
  promise?: Promise<JSX.Element>,
}

async function limitlessUseProducer(
  props: ProducerProps<JSX.Element, Error, never, [AsyncComponentType, any]>
) {
  let [component, context] = props.args
  return await component(context ?? {})
}


function infinitePromise() {
  return new Promise(resolve => {
  })
}

export function use(
  key: string,
  component: AsyncComponentType,
  context: any, // framework context
): JSX.Element | null {
  console.log('rendering', {component, context})
  let {source, state, read, lastSuccess} = useAsyncState({
    key,
    resetStateOnDispose: true,
    producer: limitlessUseProducer,
  }, [key])

  console.log('will check', state.status, lastSuccess?.status, lastSuccess?.props?.args)
  if (
    state.status === Status.initial ||
    (
      state.status !== Status.pending &&
      (
        lastSuccess?.props?.args?.[1]?.params !== context.params ||
        lastSuccess?.props?.args?.[1]?.pathname !== context.pathname ||
        lastSuccess?.props?.args?.[0] !== component
      )
    )
  ) {
    if (
      lastSuccess?.props?.args?.[1] !== context
    ){
      // console.log('______________context change', lastSuccess?.props?.args?.[1], context)

      if (
        lastSuccess?.props?.args?.[1]?.params !== context.params
      ){
        // console.log('______________context params change', lastSuccess?.props?.args?.[1]?.params, context.params)
      }
    }
    if (
      lastSuccess?.props?.args?.[0] !== component
    ){
      // console.log('______________component change')
    }
    console.log('throwing run')
    throw source!.runp(component, context)
  }

  read() // throws in pending and error
  if (state.status === Status.pending) {
    // hydrated with pending while there is nothing
    throw infinitePromise()
  }

  if (
    lastSuccess &&
    lastSuccess.status === Status.success &&
    React.isValidElement(lastSuccess.data)) {
    return lastSuccess.data
  }

  console.log('rendering', state, lastSuccess, lastSuccess?.data)
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
    search: location?.search,
    pathname: location?.pathname,
  }), [params, location?.search, location?.pathname])
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
