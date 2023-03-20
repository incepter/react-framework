import {Get, Post, Render, Resource} from "../decorators";
import Users from "../components/Users";
import * as React from "react";
import UserPostsDetails from "../components/UserPosts";
import UserDetailsComponent from "../components/UserDetailsComponent";

@Resource({path: "/users"})
export class UserResource {
  @Post()
  @Render()
  PushIntoUsers() {
    return <Users />
  }
  @Get()
  @Render()
  GetUsers() {
    return <Users />
  }
  @Render()
  @Get({path: "/:id"})
  UserDetails({body}) {
    return <UserDetailsComponent />
  }
  @Render()
  @Get({path: "/:id/posts"})
  async UserPosts({body}) {
    return <UserPostsDetails />
  }
}
