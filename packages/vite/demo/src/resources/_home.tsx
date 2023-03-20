import {Get, Post, Render, Resource, UseServer} from "../decorators";

@Resource({path: "/"})
export default class Home {

  @Render()
  @UseServer()
  @Get({path: ""})
  HomePage() {
    console.log('rendering home !')
    return <h1>Hello, World!</h1>
  }
}
