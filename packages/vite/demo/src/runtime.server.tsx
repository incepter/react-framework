import * as React from "react";
import {Route, Routes} from "react-router-dom"
import {StaticRouter} from "react-router-dom/server";
import {Application} from "./runtime";

function renderRoutes(routes) {
  return routes.map(route => {
    let props = {
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

export function RunSSRApp(routing, request) {
  return (
    <React.StrictMode>
      <Application>
        <StaticRouter location={request.url}>
          <Routes>
            {renderRoutes(routing)}
          </Routes>
        </StaticRouter>
      </Application>
    </React.StrictMode>
  )
}
