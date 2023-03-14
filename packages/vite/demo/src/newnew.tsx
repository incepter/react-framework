import {Get, Render, Resource} from "./decorators";


@Resource({path: "/mama"})
export default class Toto {
  @Render()
  @Get({path: "/joudia"})
  GetSophia({query}) {
    return <div>Hello from the {query.name}</div>
  }
}
