import * as React from "react";
import {
  createBrowserRouter,
  Route,
  RouterProvider,
  Routes
} from "react-router-dom"
import {StaticRouter} from "react-router-dom/server";
import {Application} from "./runtime";
import {Hydration} from "react-async-states";

function renderRoutes(routes) {
  return routes.map(route => {
    let props = {
      key: route.path,
      path: route.path,
      index: route.index,
      children: undefined,
      element: route.element,
    }
    if (route.children) {
      props.children = renderRoutes(route.children)
    }
    return <Route {...props}/>
  })
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

export function RunSSRApp(routing) {
  return function interceptRequest(request) {
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
              <StaticRouter location={request.url}>
                <Routes>
                  {renderRoutes(routing)}
                </Routes>
              </StaticRouter>
            </Application>
          </Hydration>
        </React.StrictMode>
      </div>
      </body>
      </html>
    )
  }
}
