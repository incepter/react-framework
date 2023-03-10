import React from "react";

export default function Greeting({ name }) {
  return (
    <div>
      <p>Hello, {name}</p>
      <button onClick={() => alert(`hello again, ${name}`)}>Alert me!</button>
    </div>
  )
}
