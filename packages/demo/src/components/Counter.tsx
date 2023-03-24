import React from "react";

export default function Counter() {
  let [count, setCount] = React.useState(0)

  return (
    <button onClick={() => setCount(prev => prev +1 )}>Count: {count}</button>
  )
}
