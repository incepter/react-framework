import * as React from "react";
import {Get, Post, PreAuthorize, Put, Render, Resource} from "../me/decorators";

@Resource({ path: "/users" })
export class UserResource {

  @Get()
  @Render()
  async GetUsers({query}) {
    return <div>Hello!</div>
  }

  @PreAuthorize()
  @Post({path: "/", produces: "application/json"})
  async AddUser({body}) {
    return {}
  }

  @Render()
  @PreAuthorize()
  @Put({path: "/:id/posts"})
  async EditUser({body}) {
    return {}
  }
}
