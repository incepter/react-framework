import * as React from "react"

function originalAddPost({body}: { body: any; }): { json: boolean; } {
    return {json: true}
}

export default function PostResource_AddPost(ctx) {
  return originalAddPost(ctx);
}
    
