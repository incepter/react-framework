import {Link} from "react-router-dom";
import React from "react";

export default function Layout() {
  return (
    <nav style={{display: "flex", flexDirection: "column"}}>
      <Link to="/users">users</Link>
      <Link to="/users/15/posts">user 15 posts</Link>
      <Link to="/posts">posts</Link>
      <Link to="/mama/joudia">mmmm</Link>
    </nav>
  )
}
