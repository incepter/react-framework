import {Get, Post, PreAuthorize, Render, Resource} from "../decorators";
import * as React from "react";
import {Outlet} from "react-router-dom";
import Layout from "../components/Layout";


@Resource({path: "/posts"})
export class PostResource {

  @Render()
  @Get({path: "/:id"})
  async PostDetails({params: {id}}) {
    let postDetails = await fetch(`https://jsonplaceholder.typicode.com/posts/${id}`)
      .then(res => res.json())
    return (
      <details open>
        <pre>
          {JSON.stringify(postDetails, null, 4)}
        </pre>
      </details>
    )
  }


  @Get()
  @Render()
  GetPosts({query}) {
    return <div><Layout />Hello! /posts root! <hr/><Outlet /></div>
  }

  @Render()
  @PreAuthorize()
  @Post({path: "/", produces: "application/json"})
  AddPost({body}) {
    return <div>Add post</div>
  }

}
