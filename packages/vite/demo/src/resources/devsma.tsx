import {Get, Render, Resource} from "../decorators";
import React from "react";


@Resource({path: "/devs"})
export default class DEVMAS {

  @Render()
  @Get({path: "/greet"})
  SayHiToDevsMa() {
    let [state, setState] = React.useState(0)
    return (
      <>
        <button
          onClick={() => setState(prev => prev + 1)}>Click {state}</button>
        <h1>Hello, world!</h1>
      </>
    )
  }
}
