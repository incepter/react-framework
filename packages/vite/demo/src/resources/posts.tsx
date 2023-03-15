import {Get, Post, PreAuthorize, Render, Resource} from "../decorators";
import * as React from "react";


@Resource({path: "/posts"})
export class PostResource {

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

  @Render()
  @PreAuthorize()
  @Get({path: "/:id"})
  async PostDetails({query}) {
    let posts = await fetch('https://jsonplaceholder.typicode.com/posts')
      .then(res => res.json())
    return (
      <details open>
        <pre>
          {JSON.stringify(posts, null, 4)}
        </pre>
      </details>
    )
  }
}
