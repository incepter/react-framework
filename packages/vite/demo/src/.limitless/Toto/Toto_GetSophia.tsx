import * as React from "react"

function originalGetSophia({query}: { query: any; }): JSX.Element {
    return <div>Hello from the {query.name}</div>
}

export default function Toto_GetSophia(ctx) {
  return originalGetSophia(ctx);
}
    
