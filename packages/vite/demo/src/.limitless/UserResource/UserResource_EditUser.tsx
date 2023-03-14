import * as React from "react"

function originalEditUser({body}: { body: any; }): JSX.Element {
    return <ul>Haha</ul>
}

export default function UserResource_EditUser(ctx) {
  return originalEditUser(ctx);
}
    
