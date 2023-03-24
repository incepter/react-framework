import React from "react";
import {Get, Post, Render, Resource} from "../decorators";
import SayHi from "../components/SayHi";
import Counter from "../components/Counter";

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
