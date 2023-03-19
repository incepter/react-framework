import {getImports, getRoutingAsString, LimitlessApi} from "./helpers";
import {Get} from "../src/decorators";

let staticImports = `import * as React from "react";\nimport { RunSSRApp } from "../runtime.server";\n\n`

export function constructServerSideApp(appConfig: Record<string, LimitlessApi>) {
  let routing = `let routing = [`

  let importsString = '';
  let gets: LimitlessApi = appConfig[`${Get.name}_/`];
  if (gets) {
    importsString += getImports(gets)
    routing += getRoutingAsString(gets, true)
  }
  routing += ']'

  return `
${staticImports}${importsString}
${routing}

export default function interceptRequest(request) {
  return RunSSRApp(routing, request);
}

console.log('interceptRequest', interceptRequest)
`
}
