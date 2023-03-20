import {Get, Render, Resource} from "../demo/src/decorators";

@Resource({path: "/pets"})
export default class PetsResource {
  @Render()
  @Get({path: "/pikachu"})
  GetPikachu({params}) {
    return <div>Hello from the {params?.name}</div>
  }
}
