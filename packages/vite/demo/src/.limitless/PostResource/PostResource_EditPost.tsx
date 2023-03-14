import * as React from "react"
import { get } from "lodash";

function originalEditPost({query}: { query: any; }): JSX.Element {
    let t = get({}, "lol")
    return <ul>Haha</ul>
}

export default function PostResource_EditPost(ctx) {
  return originalEditPost(ctx);
}
    
