

import React from 'react'
import ReactDOM from 'react-dom/client'

window.React = React;

function bootstrap() {
  const path = location.protocol + location.host + location.pathname + "index.js";
  const modulePath = new URL(path);
  console.log('root', document.getElementById('root'));
  const App = React.lazy(() => import(modulePath.toString()));
  ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
    <React.StrictMode>
      <React.Suspense>
        <h1>Hello world!</h1>
        <App />
      </React.Suspense>
    </React.StrictMode>,
  )
}
bootstrap();
//
// fetch(`index.js`).then(res => {
//   return res.json()
// }).then()
//   .catch(e => {
//     console.log('error');
//   })
//

