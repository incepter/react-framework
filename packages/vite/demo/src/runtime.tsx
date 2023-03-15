import * as React from "react";
import {useAsyncState} from "react-async-states";
import {ProducerProps} from "async-states";

type AsyncComponent = (context: any) => Promise<JSX.Element>

async function limitlessUseProducer(props: ProducerProps<JSX.Element, Error, never, [AsyncComponent, any]>) {
  let [component, context] = props.args
  return await component(context ?? {})
}

type State = {
  status: "initial" | "pending" | "error" | "success",
  data: JSX.Element | null,
  promise?: Promise<JSX.Element>,
}
let initial: State = {
  status: "initial",
  data: null,
}

export function use(
  key: string,
  component: AsyncComponent,
  context: any, // framework context
): JSX.Element | null {
  let {state, read} = useAsyncState({
    key,
    lazy: false,
    autoRunArgs: [component, context],
    producer: limitlessUseProducer,
  }, [component, context])

  if (state.status === "initial") {
    return null
  }

  return read().data as JSX.Element
}

export function SuspenseWrapper({children, fallback}) {
  return (
    <React.Suspense fallback={fallback}>
      {children}
    </React.Suspense>
  )
}

export function Use({
  key,
  component,
  context, // framework context
}: {
  key: string,
  component: AsyncComponent,
  context: any
}) {
  return use(key, component, context)
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

type LimitlessContext = {
  query?: string,
  request?: Request,
  response?: Response,
  body?: ReadableStream<any>,
  match?: Record<string, string>,
}

type TT = {
  getCurrentContext(): LimitlessContext,
  run(config: LimitlessApplicationConfig): LimitlessApplication,
}

export function Application({children}) {
  return (
    <React.Suspense fallback="Loading...">
      {children}
    </React.Suspense>
  )
}
