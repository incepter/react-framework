import {Get, Post, Render, Resource} from "../decorators";

@Resource({path: "/"})
export default class Home {

  @Render()
  @Get({path: ""})
  HomePage() {
    return <h1>Hello, World!</h1>
  }
}
