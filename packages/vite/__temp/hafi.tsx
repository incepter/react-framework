import React from "react";
import {Get, Post, Render, Resource} from "../demo/src/decorators";
import SayHi from "../demo/src/components/SayHi";
import Counter from "../demo/src/components/Counter";

@Resource({path: "/hafi"})
export default class Hafi {
  private tat: number;
  constructor() {
    this.tat = 8;
  }

  @Render()
  @Post({path: "/hi"})
  async SayHiAfter2Seconds({params}) {
    await new Promise(res => setTimeout(res, 2000));

    return (
      <div>
        <SayHi name="hafi"/>
      </div>
    )
  }

  @Render()
  @Post({path: ""})
  Hafi({params}) {
    return (
      <Counter />
    )
  }

}
