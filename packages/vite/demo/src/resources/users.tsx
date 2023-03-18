import {Get, Render, Resource} from "../decorators";
import Users from "../components/Users";
import * as React from "react";
import UserPostsDetails from "../components/UserPosts";
import UserDetailsComponent from "../components/UserDetailsComponent";

@Resource({path: "/users"})
export class UserResource {
  @Get()
  @Render()
  GetUsers({query}) {
    return <Users />
  }
  @Render()
  @Get({path: "/:id"})
  UserDetails({body}) {
    return <UserDetailsComponent />
  }
  @Render()
  @Get({path: "/:id/posts"})
  UserPosts({body}) {
    return <UserPostsDetails />
  }
}
