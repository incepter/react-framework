import * as React from "react";
import {get} from "lodash"
import {Get, Post, PreAuthorize, Render, Resource} from "./decorators";
import Users from "./components/Users";

@Resource({path: "/users"})
export class UserResource {

  @Get()
  @Render()
  GetUsers({query}) {
    return <Users />
  }

  @PreAuthorize()
  @Post({path: "/", produces: "application/json"})
  AddUser({body}) {
    return {json: true}
  }

  @Render()
  @PreAuthorize()
  @Get({path: "/:id/posts"})
  EditUser({body}) {
    return <ul>Haha</ul>
  }
}

@Resource({path: "/posts"})
export class PostResource {

  @Get()
  @Render()
  GetPosts({query}) {
    return <div>Hello!</div>
  }

  @PreAuthorize()
  @Post({path: "/", produces: "application/json"})
  AddPost({body}) {
    return {json: true}
  }

  @Render()
  @PreAuthorize()
  @Get({path: "/:id"})
  EditPost({query}) {
    let t = get({}, "lol")
    return <ul>Haha</ul>
  }
}
