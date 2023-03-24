import {Get, Render, Resource, UseServer} from "../decorators";
import * as React from "react";
import axios from "axios";
import PostsList from "../components/posts";

@Resource({path: "/posts"})
export class PostResource {
  @Render()
  @UseServer()
  @Get({path: "/:id"})
  async PostDetails({ params }) {
    let posts = await axios.get(`https://jsonplaceholder.typicode.com/posts/${params.id}`)
    let postDetails = posts.data;
    return (
      <details open>
        <pre>
          {JSON.stringify(postDetails, null, 2)}
        </pre>
      </details>
    )
  }

  @Get()
  @Render()
  async GetPosts() {
    let postsResult = await axios.get(`https://jsonplaceholder.typicode.com/posts/`)
    let data = postsResult.data
    return <PostsList posts={data} />
  }
}
