import * as React from "react"
import Users from "../../components/Users";

function originalGetUsers({query}: { query: any; }): JSX.Element {
    return <Users />
}

export default function UserResource_GetUsers(ctx) {
  return originalGetUsers(ctx);
}
    
