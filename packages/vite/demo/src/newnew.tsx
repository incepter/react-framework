import {Get, Render, Resource} from "./decorators";


@Resource({path: "/mama"})
export default class Toto {
  @Render()
  @Get({path: "/joudia"})
  async GetSophia({query}) {
    return <div>Hello from the {query?.name}</div>
  }
}
