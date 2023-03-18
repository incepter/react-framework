import React from "react";
import Layout from "./Layout";
import {Outlet} from "react-router-dom";

export default function UserDetailsComponent() {
  return (
    <div>
      <div>User details !!</div>
      <hr />
      <Outlet />
    </div>
  )
}
