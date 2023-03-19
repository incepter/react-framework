import {Get, Post, Render, Resource} from "../decorators";

@Resource({path: "/"})
export default class Home {

  @Render()
  @Get({path: ""})
  HomePage() {
    console.log('rendering home !')
    return <h1>Hello, World!</h1>
  }
}
