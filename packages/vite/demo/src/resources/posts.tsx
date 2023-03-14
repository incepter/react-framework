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
  EditPost({query}) {
    // await new Promise(res => setTimeout(res, 2000))
    console.log('resolve')
    return <ul>edit post</ul>
  }
}
