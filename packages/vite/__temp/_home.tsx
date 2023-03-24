import {Get, Post, Render, Resource, UseServer} from "../demo/src/decorators";
import Layout from "../demo/src/components/Layout";

@Resource({path: "/"})
export default class Home {

  @Render()
  @UseServer()
  @Get({path: ""})
  HomePage() {
    return (
      <>
        <h1>Hello, World!!!</h1>
        <hr />
        <Layout />
      </>
    )
  }
}
