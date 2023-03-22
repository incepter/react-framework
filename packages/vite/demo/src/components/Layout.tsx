import React from "react";
import {useRouter} from "../_router";

export default function Layout() {
  return (
    <nav style={{display: "flex", flexDirection: "column"}}>
      <Link to="/users">users</Link>
      <Link to="/users/15/posts">user 15 posts</Link>
      <Link to="/posts">posts</Link>
      <Link to="/pets/pikachu">pika</Link>
    </nav>
  )
}

export function Link({to, children, ...rest}, {to: string, children: any}) {
  let router = useRouter();

  return (
    <a onClick={e => {
      e.preventDefault();
      console.log("click");
      // @ts-ignore
      const href = e.target.getAttribute("href");
      window.history.pushState(null, "", href);
      router.onRouteChange();
    }} href={to} {...rest}>{children}</a>
  )
}
