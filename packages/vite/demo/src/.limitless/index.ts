import * as React from "react";
export let LazyUserResource_GetUsers = React.lazy(() => import("./UserResource/UserResource_GetUsers"));
export { default as LazyUserResource_AddUser } from "./UserResource/UserResource_AddUser";
export let LazyUserResource_EditUser = React.lazy(() => import("./UserResource/UserResource_EditUser"));
export let LazyPostResource_GetPosts = React.lazy(() => import("./PostResource/PostResource_GetPosts"));
export { default as LazyPostResource_AddPost } from "./PostResource/PostResource_AddPost";
export let LazyPostResource_EditPost = React.lazy(() => import("./PostResource/PostResource_EditPost"));
export let LazyToto_GetSophia = React.lazy(() => import("./Toto/Toto_GetSophia"));