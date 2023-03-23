import {
  Get,
  Post,
  PreAuthorize,
  Render,
  Resource,
  UseServer
} from "../decorators";
import * as React from "react";
import axios from "axios";
import PostsList from "../components/posts";


@Resource({path: "/posts"})
export class PostResource {

  @Render()
  @UseServer()
  @Get({path: "/:id"})
  async PostDetails({params}) {
    let postDetails = await axios.get(`https://jsonplaceholder.typicode.com/posts/${params.id}`)
    return (
      <details open>
        <pre>
          {JSON.stringify(postDetails.data, null, 4)}
        </pre>
      </details>
    )
  }


  @Get()
  @Render()
  async GetPosts() {
    let posts = await axios.get(`https://jsonplaceholder.typicode.com/posts/`)
    return <PostsList posts={posts} />
  }

  @Render()
  @PreAuthorize()
  @Post({path: "/", produces: "application/json"})
  AddPost({body}) {
    return <div>Add post</div>
  }

}
