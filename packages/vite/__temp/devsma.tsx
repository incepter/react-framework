import {Get, Render, Resource} from "../demo/src/decorators";
import React from "react";


@Resource({path: "/devss"})
export default class DEVMAS {

  @Render()
  @Get({path: "/greets"})
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
