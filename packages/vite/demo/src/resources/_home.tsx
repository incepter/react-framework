import {Get, Post, Render, Resource, UseServer} from "../decorators";
import Layout from "../components/Layout";

@Resource({path: "/"})
export default class Home {

  @Render()
  @UseServer()
  @Get({path: ""})
  HomePage() {
    console.log('rendering home !')
    return (
      <>
        <h1>Hello, World!</h1>
        <hr />
        <Layout />
      </>
    )
  }
}
