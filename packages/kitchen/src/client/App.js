import React from "react";


export default function App({name = "world!!", users = [], context}) {
  console.log('rendering app', context)
  return (
    <div>
      <span>Hello, {name}</span>
      <form method="get" action="/greeting">
        <input autoFocus name="name" placeholder="type a name"/>
        <button type="submit">Go!</button>
      </form>
      <hr />
      <ul>
        {(users ?? []).map(t => <li key={t.id}>user {t.email}</li>)}
      </ul>
    </div>
  );
}
