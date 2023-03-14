import * as React from "react"

function originalGetPosts({query}: { query: any; }): JSX.Element {
    return <div>Hello!</div>
}

export default function PostResource_GetPosts(ctx) {
  return originalGetPosts(ctx);
}
    
