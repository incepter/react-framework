import React from "react";
import Layout, {Link} from "./Layout";
import {Outlet} from "../_router";

export default function PostsList({posts}) {

  return <div>
    <Layout/>Hello! /posts root! <hr/>
    <Outlet/>
    {posts.map(post => (
      <li key={post.id}><Link
        to={`/posts/${post.id}`}>{post.id} - {post.title}</Link></li>
    ))}
  </div>
}
