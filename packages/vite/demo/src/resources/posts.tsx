import {Get, Post, PreAuthorize, Render, Resource} from "../decorators";
import * as React from "react";


@Resource({path: "/posts"})
export class PostResource {

  @Render()
  @Get({path: "/:id"})
  async PostDetails({match: {id}}) {
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
    return <div>Hello! /posts root!</div>
  }

  @Render()
  @PreAuthorize()
  @Post({path: "/", produces: "application/json"})
  AddPost({body}) {
    return <div>Add post</div>
  }

}
