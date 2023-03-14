import {Get, Render, Resource} from "../decorators";

@Resource({path: "/pets"})
export default class PetsResource {
  @Render()
  @Get({path: "/pikachu"})
  GetPikachu({query}) {
    return <div>Hello from the {query?.name}</div>
  }
}
