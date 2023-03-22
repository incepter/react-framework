import {getImports, getRoutingAsString, LimitlessApi} from "./helpers";
import {Get} from "../src/decorators";

let staticImports = `import * as React from "react";\nimport { RunSSRApp } from "../runtime.server";\n\n`

export function constructServerClientApp(appConfig: Record<string, LimitlessApi>) {
  let routing = `let routing = [`

  let importsString = '';
  let gets: LimitlessApi = appConfig[`${Get.name}_/`];
  if (gets) {
    importsString += getImports(gets)
    routing += getRoutingAsString(gets, true)
  }
  routing += ']'

  return `import React from 'react';
import {renderClientApp} from '../runtime.server';\n
import {hydrateRoot} from 'react-dom/client';
${importsString}

${routing}

hydrateRoot(document.getElementById('root'), renderClientApp(routing));
`
}
