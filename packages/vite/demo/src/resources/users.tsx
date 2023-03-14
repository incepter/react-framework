import {Get, PreAuthorize, Render, Resource} from "../decorators";
import Users from "../components/Users";
import * as React from "react";
import UserPosts from "../components/UserPosts";

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
