import React from "react";

export default function Users() {
  let [count, setCount] = React.useState(0)
  return <button
    onClick={() => setCount(prev => prev + 1)}>Hello! {count}</button>
}
