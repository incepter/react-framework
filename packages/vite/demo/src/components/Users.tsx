import React from "react";
import Layout from "./Layout";
import {Outlet} from "react-router-dom";

export default function Users() {
  let [count, setCount] = React.useState(0)
  return (

    <div>
      <Layout />
      <button
        onClick={() => setCount(prev => prev + 1)}>Hello! {count}</button>
      <hr />
      <Outlet />
    </div>
  )
}
