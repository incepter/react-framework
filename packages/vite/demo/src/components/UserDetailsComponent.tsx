import React from "react";
import {Outlet} from "../_router";

export default function UserDetailsComponent() {
  return (
    <div>
      <div>User details !!</div>
      <hr />
      <Outlet />
    </div>
  )
}
