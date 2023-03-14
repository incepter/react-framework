import * as React from "react";
import {get} from "lodash"
import {Get, Post, PreAuthorize, Render, Resource} from "./decorators";
import Users from "./components/Users";
import UserPosts from "./components/UserPosts";

@Resource({path: "/users"})
export class UserResource {
  @Get()
  @Render()
  GetUsers({query}) {
    return <Users />
  }
  @Render()
  @PreAuthorize()
  @Get({path: "/:id/posts"})
  UserPosts({body}) {
    return <UserPosts />
  }
}

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
