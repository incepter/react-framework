import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import Greeting from "./Greeting";


const isInServer = typeof window === "undefined";
let ComponentToMount = App;
let ComponentToMountProps = {};

if (!isInServer) {
  const {location: {href}} = window;
  const name = href.match(/\/greeting\?name=(.*?)$/i)?.[1];
  if (name) {
    ComponentToMount = Greeting;
    ComponentToMountProps = {name};
  }
  if (window.hydrationData) {
    Object.assign(ComponentToMountProps, window.hydrationData)
  }
}

ReactDOM.hydrateRoot(
  document.getElementById('root'),
  <ComponentToMount {...ComponentToMountProps} />,
);
