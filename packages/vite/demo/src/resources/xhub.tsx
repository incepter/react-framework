import {Get, Render, Resource} from "../decorators";

@Resource({path: "/xhub"})
export default class XhubResource {
  @Render()
  @Get({ path: "/greet" })
  GreetAllXTalents() {
    return <h1>Hello xTalents !</h1>
  }
}
