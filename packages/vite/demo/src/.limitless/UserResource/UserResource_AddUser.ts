import * as React from "react"

function originalAddUser({body}: { body: any; }): { json: boolean; } {
    return {json: true}
}

export default function UserResource_AddUser(ctx) {
  return originalAddUser(ctx);
}
    
