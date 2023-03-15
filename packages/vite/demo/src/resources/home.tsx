import {Get, Render, Resource} from "../decorators";

@Resource({path: "/"})
export default class Home {

  @Render()
  @Get({path: ""})
  HomePage() {
    return <h1>Hi Home page!! :*</h1>
  }
  @Render()
  @Get({path: "/back"})
  BackHomePage() {
    return <h1>Back ruuuun!!</h1>
  }
}
