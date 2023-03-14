import * as React from "react";
import {Get, Post, PreAuthorize, Render, Resource} from "./decorators";

@Resource({path: "/users"})
export class UserResource {

  @Get()
  @Render()
  async GetUsers({query}) {
    return <div>Hello!</div>
  }

  @PreAuthorize()
  @Post({path: "/", produces: "application/json"})
  async AddUser({body}) {
    return {json: true}
  }

  @Render()
  @PreAuthorize()
  @Get({path: "/:id/posts"})
  async EditUser({body}) {
    return <ul>Haha</ul>
  }
}

@Resource({path: "/posts"})
export class PostResource {

  @Get()
  @Render()
  async GetPosts({query}) {
    return <div>Hello!</div>
  }

  @PreAuthorize()
  @Post({path: "/", produces: "application/json"})
  async AddPost({body}) {
    return {json: true}
  }

  @Render()
  @PreAuthorize()
  @Get({path: "/:id"})
  async EditPost() {
    return <ul>Haha</ul>
  }
}
