import esbuild from 'esbuild'
import path from 'path'
import fs from 'fs'
import {Plugin} from 'vite'
import {MethodDeclaration, Project, SourceFile} from 'ts-morph'
import {
  FileImports,
  getPathFromDecorator,
  makeAsyncLimitilessFunction,
  makeLimitilessFunction,
  parseDecorator,
  parseMethodText,
  scanForNeededDeclarations
} from "./helpers";
import {Get, Resource} from "../src/decorators";

type SingleFlatRoute = {
  name: string,
  path: string,
  file: string,
  element: string,
  method: string,
  resource: string,
  componentName: string,
  node: MethodDeclaration,
  decorators: { [name: string]: true },
}
type FlatRouting = Record<string, SingleFlatRoute>

function performFlatRouting(
  project: Project,
  sources: SourceFile[]
) {
  let filters = []
  let flatRoutingByMethod: Record<string, FlatRouting> = {}

  for (let sourceFile of sources) {
    for (let cls of sourceFile.getClasses()) {
      let isResource = false;
      let resourceDecorator;
      // let isConfiguration = false;

      for (let decorator of cls.getDecorators()) {
        if (decorator.getName() === Resource.name) {
          isResource = true
          resourceDecorator = decorator
          break
        }
        // if (decorator.getName() === Configuration.name) {
        //   isConfiguration = true
        //   break
        // }
      }
      if (isResource) {
        let resourcePath = getPathFromDecorator(resourceDecorator)
        let methods = cls.getMethods()

        for (let method of methods) {
          let methodResult: SingleFlatRoute | undefined;

          let className = cls.getName();
          for (let decorator of method.getDecorators()) {
            let result = parseDecorator(decorator)
            if (result) {
              if (!methodResult) {
                methodResult = {
                  path: "",
                  node: method,
                  method: Get.name,
                  name: method.getName(),
                  resource: className,
                  file: sourceFile.getFilePath(),
                  element: `<Lazy_${className}_${method.getName()} />`,
                  componentName: `${className}_${method.getName()}`,
                  decorators: {
                    [result.decoratorName]: true,
                  }
                }
              }

              let routeMethod: string | null = typeof result.path === "string" ? result.decoratorName : null;
              let isRoute = routeMethod !== null;

              if (isRoute) {
                methodResult.path = (resourcePath + result.path);
                methodResult.method = routeMethod;
                methodResult.decorators[result.decoratorName] = true;
              } else {
                methodResult.decorators[result.decoratorName] = true;
              }
            }
          }

          if (methodResult) {
            let httpMethodType = methodResult.method;
            if (!flatRoutingByMethod[httpMethodType]) {
              flatRoutingByMethod[httpMethodType] = {}
            }

            flatRoutingByMethod[httpMethodType][methodResult.path] = methodResult
          }
        }
      }
    }
  }

  return flatRoutingByMethod
}

/** @type {import('vite').UserConfig} */
export default function transformTsMorph(): Plugin {
  let config;
  let tempDir;
  let buildMode;
  let project: Project;
  let sources: SourceFile[];

  return {
    name: 'resource-plugin',
    // handleHotUpdate({file}) {
    //   performWork()
    // },
    generateBundle() {
      console.log('generate bundle', buildMode)
      if (buildMode === "ssr") {
        let entryPoints = [tempDir + "/client.tsx"]
        esbuild
          .build({
            entryPoints,
            bundle: true,
            format: "esm",
            outdir: 'dist/client',
            splitting: true,
            target: 'es2017',
            jsx: "transform",
            platform: 'browser',
            loader: {
              '.js': 'jsx',
              '.ts': 'tsx',
              '.tsx': 'tsx',
            },
          })
          .catch(() => process.exit(1));
      }

    },
    async configResolved(configuration) {
      config = configuration;
      tempDir = path.join(config.root, 'src/.limitless');
      await performWork()
    },
  };

  function constructBundle(
    routing: Record<string, FlatRouting>,
    mode: "csr" | "ssr" | "rsc"
  ) {
    if (mode === "csr") {
      constructClientBundle(routing)
    }
    if (mode === "ssr") {
      constructServerBundle(routing)
    }
  }

  function constructClientBundle(
    routing: Record<string, FlatRouting>,
  ) {
    let routingFileImports = `import * as React from "react";\nimport {RunCSRApp} from "../runtime";\n`
    let routingFileExports = ''

    let indexFileExports = ''
    let indexFileImports = 'import * as React from "react";\n\n'
    for (let [httpMethod, allRoutes] of Object.entries(routing)) {
      let allMethodRoutesRouting = `{`
      for (let [fullPath, elementConfig] of Object.entries(allRoutes)) {
        let declarations: FileImports = {
          react: {
            from: "react",
            default: "React",
          }
        }
        // let now = Date.now()
        let middleDir = "/shared/"
        if (elementConfig.decorators.UseServer) {
          middleDir = "/server/"
        }
        if (elementConfig.decorators.UseClient) {
          middleDir = "/server/"
        }

        let ext = elementConfig.decorators.Render ? ".tsx" : ".ts"
        let functionName = elementConfig.componentName;
        let relativeFilePath = "." + middleDir + functionName
        let targetFile = tempDir + middleDir + functionName + ext
        let file = project.createSourceFile(targetFile, undefined, {overwrite: true})

        let targetFunction = elementConfig.node;
        let realLimitlessComponent = targetFunction.isAsync() ?
          makeAsyncLimitilessFunction(functionName, `original${functionName}`, fullPath) :
          makeLimitilessFunction(functionName, `original${functionName}`, fullPath)

        routingFileImports += `import { Lazy_${functionName} } from "./index";\n`
        indexFileExports += `export const Lazy_${functionName} = React.lazy(() => import("${relativeFilePath}"));\n`

        scanForNeededDeclarations(targetFunction, file, declarations)
        file.addStatements(formatImports(declarations))
        file.addStatements(realLimitlessComponent.imports)
        file.addStatements("\n\n" + parseMethodText(targetFunction, file, `original${functionName}`))
        file.addStatements(realLimitlessComponent.code)

        file.save()
        allMethodRoutesRouting += `'${fullPath}': {path: '${fullPath}', element: ${elementConfig.element}},`
        // console.log('processed in', Date.now() - now)
      }
      allMethodRoutesRouting += '}'
      routingFileExports += `'${httpMethod}': ${allMethodRoutesRouting},`
    }
    routingFileExports = `export const routing = Object.freeze({${routingFileExports}});\n\n`
    routingFileExports += `RunCSRApp(routing);\n\n`

    fs.writeFileSync(tempDir + "/client.tsx", routingFileImports + routingFileExports)
    fs.writeFileSync(tempDir + "/index.tsx", indexFileImports + indexFileExports)
  }

  function constructServerBundle(
    routing: Record<string, FlatRouting>,
  ) {

    let routingFileImports = `import * as React from "react";\n`
    let routingFileExports = ``

    let indexFileExports = ''
    let indexFileImports = 'import * as React from "react";\n\n'
    for (let [httpMethod, allRoutes] of Object.entries(routing)) {
      let allMethodRoutesRouting = `{`
      for (let [fullPath, elementConfig] of Object.entries(allRoutes)) {
        let declarations: FileImports = {
          react: {
            from: "react",
            default: "React",
          }
        }
        let now = Date.now()
        let middleDir = "/shared/"
        if (elementConfig.decorators.UseServer) {
          middleDir = "/server/"
        }
        if (elementConfig.decorators.UseClient) {
          middleDir = "/server/"
        }

        let ext = elementConfig.decorators.Render ? ".tsx" : ".ts"
        let functionName = elementConfig.componentName;
        let relativeFilePath = "." + middleDir + functionName
        let targetFile = tempDir + middleDir + functionName + ext
        let file = project.createSourceFile(targetFile, undefined, {overwrite: true})

        let targetFunction = elementConfig.node;
        let realLimitlessComponent = targetFunction.isAsync() ?
          makeAsyncLimitilessFunction(functionName, `original${functionName}`, fullPath) :
          makeLimitilessFunction(functionName, `original${functionName}`, fullPath)

        routingFileImports += `import { Lazy_${functionName} } from "./index";\n`
        indexFileExports += `export const Lazy_${functionName} = React.lazy(() => import("${relativeFilePath}"));\n`

        scanForNeededDeclarations(targetFunction, file, declarations)
        file.addStatements(formatImports(declarations))
        file.addStatements(realLimitlessComponent.imports)
        file.addStatements("\n\n" + parseMethodText(targetFunction, file, `original${functionName}`))
        file.addStatements(realLimitlessComponent.code)

        file.save()
        allMethodRoutesRouting += `'${fullPath}': {path: '${fullPath}', element: ${elementConfig.element}},`
        console.log(`processed [${functionName}] in`, Date.now() - now)
      }
      allMethodRoutesRouting += '}'
      routingFileExports += `'${httpMethod}': ${allMethodRoutesRouting},`
    }
    routingFileExports = `export const routing = Object.freeze({${routingFileExports}});\n`

    fs.writeFileSync(tempDir + "/routing.tsx", routingFileImports + routingFileExports)
    fs.writeFileSync(tempDir + "/index.tsx", indexFileImports + indexFileExports)
    fs.writeFileSync(tempDir + "/client.tsx", `import * as React from "react";
import {routing} from "./routing";
import {renderClientApp} from "../runtime";
import {hydrateRoot} from "react-dom/client";

hydrateRoot(document.getElementById('root') as HTMLDivElement, renderClientApp(routing));
`)
    fs.writeFileSync(tempDir + "/server-entry.tsx", `import * as React from "react";
import {routing} from "./routing";
import {RunSSRApp} from "../runtime";

let interceptApp = RunSSRApp(routing);
export default interceptApp;
`)
      let serverJs = config.root + "/plugins/static/server.js";
      fs.copyFileSync(serverJs, tempDir + "/server.js");
  }


  async function performWork() {
    prepareWorkDir();
    prepareProjectAndAddFiles();
    buildMode = resolveBuildMode();

    let flatRouting = performFlatRouting(project, sources)
    constructBundle(flatRouting, buildMode)
  }

  function prepareWorkDir() {
    fs.rmSync(tempDir, {recursive: true, force: true});
    fs.mkdirSync(tempDir, {recursive: true});
    fs.mkdirSync(tempDir + "/client", {recursive: true});
    fs.mkdirSync(tempDir + "/server", {recursive: true});
    fs.mkdirSync(tempDir + "/shared", {recursive: true});
  }

  function prepareProjectAndAddFiles() {
    project = new Project();
    sources = project.addSourceFilesAtPaths(config.root + '/src/**/*.tsx');
  }

  function resolveBuildMode(): "csr" | "ssr" | "rsc" {
    let filePath = config.root + "/.limitless.json";
    try {
      if (fs.existsSync(filePath)) {
        return JSON.parse(fs.readFileSync(filePath, "utf-8")).target;
      }
      return "csr"
    } catch (e) {
      return "csr"
    }
  }
}

function formatImports(declarations: FileImports) {
  let str = ''
  Object.values(declarations)
    .forEach(t => {
      let hasDefault = !!t.default
      let hasNamed = !!t.named && Object.keys(t.named).length > 0
      let hasNamespace = !!t.namespace && Object.keys(t.namespace).length > 0

      str += 'import '
      if (hasDefault) {
        str += `${t.default}${hasNamed || hasNamespace ? ', ' : ' '}`
      }

      if (hasNamespace) {
        str += Object.keys(t.namespace).map(t => `* as ${t}`).join(", ") + " "
      }

      if (hasNamed) {
        str += '{ '
      }
      if (hasNamed) {
        str += Object.keys(t.named).join(", ")
      }
      if (hasNamed) {
        str += ' } '
      }

      str += `from "${t.from}";\n`
    })

  return str;
}
