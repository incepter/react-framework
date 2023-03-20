import {Get, Post, PreAuthorize, Render, Resource} from "../decorators";
import * as React from "react";
import axios from "axios";
import {Link, Outlet} from "react-router-dom";
import Layout from "../components/Layout";


@Resource({path: "/posts"})
export class PostResource {

  @Render()
  @Get({path: "/:id"})
  async PostDetails({params: {id}}) {
    console.log('start getting post details', id)
    let postDetails = await axios.get(`https://jsonplaceholder.typicode.com/posts/${id}`)
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
    console.log('start getting posts')
    // @ts-ignore
    let posts = await axios.get(`https://jsonplaceholder.typicode.com/posts/`)
    return <div>
      <Layout/>Hello! /posts root! <hr/>
      <Outlet/>
      {posts.data.map(post => (
        <li key={post.id}><Link  to={`${post.id}`}>{post.id} - {post.title}</Link></li>
      )) }
    </div>
  }

  @Render()
  @PreAuthorize()
  @Post({path: "/", produces: "application/json"})
  AddPost({body}) {
    return <div>Add post</div>
  }

}
