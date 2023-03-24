import path from 'path'
import {
  Configuration,
  Decorators,
  Delete,
  Get,
  Patch,
  Post,
  PreAuthorize,
  Put,
  Render, Resource,
  UseServer
} from "../src/decorators";
import {
  ClassDeclaration,
  Decorator,
  Identifier,
  MethodDeclaration,
  ObjectLiteralExpression, Project,
  PropertyAssignment,
  SourceFile,
  SyntaxKind,
} from "ts-morph";
import fs from "fs";

export function getProperty(
  obj: ObjectLiteralExpression, prop: string): string | undefined {
  if (!obj) {
    return
  }
  let pathProp = obj.getProperty(prop) as PropertyAssignment | undefined;
  return pathProp.getInitializer()?.getText()
}

type LimitlessRouteConfig = {
  path: string,
  method: string,
  combinedPath: string,
  configuredPath: string,

  name: string,
  module: string,
  capabilities: {},

  children?: Record<string, LimitlessRouteConfig>
}

export function getPathFromDecorator(
  decorator: Decorator, defaultValue = '"/"'): string {
  let config = decorator.getArguments()[0];
  let path = defaultValue
  if (config && config.getKind() === SyntaxKind.ObjectLiteralExpression) {
    path = getProperty(config as ObjectLiteralExpression, 'path')
  }

  return JSON.parse(path)
}

export type LimitlessApi = {
  path: string,
  element: string,
  moduleName: string,
  modulePath: string,

  children?: Record<string, LimitlessApi>
}

type ParsedDecorator = {
  path: string,
  decoratorName: string,
}

export function parseDecorator(
  decorator: Decorator,
): ParsedDecorator | null {
  let name = decorator.getName()
  if (Decorators[name]) {
    switch (name) {
      case Render.name:
      case UseServer.name:
      case PreAuthorize.name: {
        decorator.remove()
        return {
          decoratorName: name,
          path: null,
        }
      }
      case Get.name:
      case Post.name:
      case Delete.name:
      case Patch.name:
      case Put.name: {
        let pathFromDecorator = getPathFromDecorator(decorator, '""');
        decorator.remove()
        return {
          decoratorName: name,
          path: pathFromDecorator,
        }
      }
    }
  }
  return null;
}

export type FileImports = Record<string,
  {
    from: string,
    default?: string,
    named?: Record<string, true>,
    namespace?: Record<string, true>,
  }>

export function containsFrameworkAPIUsage(cls: ClassDeclaration) {
  for (let decorator of cls.getDecorators()) {
    let decoratorName = decorator.getName();
    if (decoratorName === Resource.name || decoratorName === Configuration.name) {
      return true
    }
  }
  return false
}

export function scanForNeededDeclarations(
  method: MethodDeclaration,
  targetFile: SourceFile,
  output: FileImports
) {
  // targetFile.getRelativePathAsModuleSpecifierTo(
  //   importDeclaration.getModuleSpecifierSourceFile()?.getFilePath() ?? importDeclaration.getModuleSpecifierValue()
  // )
  // return;
  method.forEachDescendant((node) => {
    if (node.getKind() === SyntaxKind.Identifier) {
      let identifier = node as Identifier;
      let symbol = identifier.getSymbol();
      if (!symbol) {
        return false;
      }
      symbol
        .getDeclarations()
        .forEach(declaration => {
          let importDeclaration = declaration.getFirstAncestorByKind(SyntaxKind.ImportDeclaration)
          if (importDeclaration) {
            let isRelative = importDeclaration.isModuleSpecifierRelative()
            let namespaceImport = importDeclaration.getNamespaceImport()?.getText()
            let defaultImportName = importDeclaration.getDefaultImport()?.getText()
            let named = importDeclaration.getNamedImports().reduce((
              a, t) => (a[t.getName()] = true, a), {});
            let resolvedModuleSpecifier = isRelative ?
              path.relative(
                path.dirname(targetFile.getFilePath()),
                importDeclaration.getModuleSpecifierSourceFile().getFilePath()
              ).replace(/\\/g, "/").replace(/\.tsx?$/, "")
              :
              importDeclaration.getModuleSpecifierValue()

            if (!output[resolvedModuleSpecifier]) {
              output[resolvedModuleSpecifier] = {
                from: resolvedModuleSpecifier,
              }
            }

            let current = output[resolvedModuleSpecifier]

            current.default = defaultImportName
            if (namespaceImport) {
              if (!current.namespace) {
                current.namespace = {}
              }
              current.namespace[namespaceImport] = true;
            }
            if (importDeclaration.getNamedImports()) {
              if (!current.named) {
                current.named = {}
              }
              Object.assign(current.named, named)
            }
          }
        })
    }
  });
}

function getUsedVarsAndParams(method, returnStatement) {
  const identifierReferences = returnStatement.getDescendantsOfKind(SyntaxKind.Identifier);

  const localVarDeclarations = method.getBody().getDescendantsOfKind(SyntaxKind.VariableDeclaration);
  const localVarNames = localVarDeclarations.map(decl => decl.getName())
    .reduce((acc, t) => (acc[t]=t, acc), {});

  // Get parameter names
  const parameterNames = method.getParameters()
    .map(parameter => parameter.getName().replace(/\{\s+/, "").replace(/\s+\}/, ""))
    .reduce((acc, t) => (acc[t]=t, acc), {})

  // Combine local variable and parameter names
  const localVarAndParamNames = {...localVarNames, ...parameterNames};

  return identifierReferences
    .map(identifier => identifier.getText())
    .filter(identifier => localVarAndParamNames[identifier]).reduce((acc, t) => (acc[t]=t, acc), {})
}

export function parseMethodText(
  method: MethodDeclaration,
  sourceFile: SourceFile,
  functionName: string
) {
  let methodContent = method.getText().replace(method.getName(), functionName)
  if (method.isAsync()) {
    methodContent = methodContent.replace("async", "async function")
    let returnStatement = method.getBody().getDescendantsOfKind(SyntaxKind.ReturnStatement)[0];
    let returnedText = returnStatement.getText();


    let usedVars = Object.keys(getUsedVarsAndParams(method, returnStatement))
    let extractedComponent = `function Extracted({${usedVars.join(", ")}}) {
  ${returnedText}
}\n\n`;
    let newReturn = `return <Extracted ${usedVars.map(t=> `${t}={${t}}`).join(" ")} />`
    let correctedFn = methodContent.replace(returnedText, newReturn)

    return extractedComponent + correctedFn;
  }

  return "function " + methodContent;
}

export function makeLimitilessFunction(
  functionName: string,
  originalFunctionName: string,
  routePath: string
): LimitlessFnOutput {

  return {
    imports: `import { UseComponent, SuspenseWrapper } from "../../runtime";`,
    code: `
// ROUTE = ${routePath}
export default function ${functionName}() {
  return (
    <SuspenseWrapper fallback="loading">
        <UseComponent component={${originalFunctionName}} />
    </SuspenseWrapper>
  )
}
`
  }
}

export type LimitlessFnOutput = {
  code: string,
  imports: string,
}

export function makeAsyncLimitilessFunction(
  functionName: string,
  originalFunctionName: string,
  routePath: string
): LimitlessFnOutput {
  return {
    imports: `import { UseAsyncComponent, SuspenseWrapper } from "../../runtime";`,
    code: `
// ROUTE = ${routePath}
export default function ${functionName}() {
  return (
    <SuspenseWrapper fallback="loading data">
      <UseAsyncComponent 
        componentKey="${functionName}"
        extractedComponent={Extracted}
        component={${originalFunctionName}}
      />
    </SuspenseWrapper>
  )
}
`
  }
}

export function getRoutingAsString(
  api: LimitlessApi, isTopLevel = false): string {

  if (isTopLevel) {
    return Object.values(api.children)
      .map(val => getRoutingAsString(val))
      .filter(t => typeof t === "string" && t.trim() !== "")
      .join(",")
  } else {
    let didAddElement = false;
    let result = ''
    if (typeof api.path === "string") {
      didAddElement = true
      result += `{ ${api.path === "" ? "index: true," : `path: "${api.path}",`} element: ${api.element}`
    }
    if (api.children) {
      let content = Object.values(api.children)
        .map(val => getRoutingAsString(val))
        .filter(t => typeof t === "string" && t.trim() !== "")
        .join(",");
      if (result !== "") {
        result += `, children: [${content}]`
      } else {
        if (content && content !== "") {
          result += `${content}`
        }
      }
    }
    if (didAddElement) {
      result += "}"
    }

    return result
  }
}

export function getImports(api: LimitlessApi): {} {
  let imports = '';
  if (api.moduleName) {
    imports = `import { Lazy_${api.moduleName} } from "${api.modulePath}";\n`;
  }
  return !api.children ? imports : `${imports}${Object.values(api.children).map(getImports).join("")}`
}

type SingleFlatRoute = {
  name: string,
  path: string,
  file: string,
  method: string,
  element: string,
  resource: string,
  processed?: boolean,
  componentName: string,
  node: MethodDeclaration,
  decorators: { [name: string]: true },
}
export type FlatRouting = Record<string, SingleFlatRoute>

export function performFrameworkAPIExtractionOnFile(
  sourceFile: SourceFile,
): Record<string, FlatRouting> {
  let routing: Record<string, FlatRouting> = {}
  for (let cls of sourceFile.getClasses()) {
    for (let decorator of cls.getDecorators()) {
      if (decorator.getName() === Resource.name) {
        let resourcePath = getPathFromDecorator(decorator)
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
            if (!routing[httpMethodType]) {
              routing[httpMethodType] = {}
            }

            routing[httpMethodType][methodResult.path] = methodResult
          }
        }
      }
      if (decorator.getName() === Configuration.name) {
        break
      }
    }
  }
  return routing
}

export function constructBundle(
  config,
  project: Project,
  routing: Record<string, FlatRouting>,
  tempDir: string,
  mode: "csr" | "ssr" | "rsc"
) {
  if (mode === "csr") {
    constructClientBundle(project, routing, tempDir)
  }
  if (mode === "ssr") {
    constructServerBundle(config, project, routing, tempDir)
  }
}

export function constructClientBundle(
  project: Project,
  routing: Record<string, FlatRouting>,
  tempDir: string,
) {
  let routingFileImports = `import * as React from "react";\nimport {RunCSRApp} from "../runtime";\n`
  let routingFileExports = ''

  let indexFileExports = ''
  let indexFileImports = 'import * as React from "react";\n\n'
  for (let [httpMethod, allRoutes] of Object.entries(routing)) {
    let allMethodRoutesRouting = `{`
    for (let [fullPath, elementConfig] of Object.entries(allRoutes)) {
      let functionName = elementConfig.componentName;
      let middleDir = "/shared/"
      if (elementConfig.decorators.UseServer) {
        middleDir = "/server/"
      }
      if (elementConfig.decorators.UseClient) {
        middleDir = "/server/"
      }

      let relativeFilePath = "." + middleDir + functionName
      if (!elementConfig.processed) {
        let now = Date.now()
        let declarations: FileImports = {
          react: {
            from: "react",
            default: "React",
          }
        }


        let ext = elementConfig.decorators.Render ? ".tsx" : ".ts"
        let targetFile = tempDir + middleDir + functionName + ext
        let file = project.createSourceFile(targetFile, undefined, {overwrite: true})

        let targetFunction = elementConfig.node;
        let realLimitlessComponent = targetFunction.isAsync() ?
          makeAsyncLimitilessFunction(functionName, `original${functionName}`, fullPath) :
          makeLimitilessFunction(functionName, `original${functionName}`, fullPath)

        scanForNeededDeclarations(targetFunction, file, declarations)
        file.addStatements(formatImports(declarations))
        file.addStatements(realLimitlessComponent.imports)
        file.addStatements("\n\n" + parseMethodText(targetFunction, file, `original${functionName}`))
        file.addStatements(realLimitlessComponent.code)

        file.save()
        elementConfig.processed = true
        console.log(`processed [${functionName}] in`, Date.now() - now)
      }

      routingFileImports += `import { Lazy_${functionName} } from "./index";\n`
      indexFileExports += `export const Lazy_${functionName} = React.lazy(() => import("${relativeFilePath}"));\n`
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

export function constructServerBundle(
  config,
  project: Project,
  routing: Record<string, FlatRouting>,
  tempDir: string,
) {

  let routingFileImports = `import * as React from "react";\n`
  let routingFileExports = ``

  let indexFileExports = ''
  let indexFileImports = 'import * as React from "react";\n\n'
  for (let [httpMethod, allRoutes] of Object.entries(routing)) {
    let allMethodRoutesRouting = `{`
    for (let [fullPath, elementConfig] of Object.entries(allRoutes)) {
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
      if (!elementConfig.processed) {
        let now = Date.now()
        let declarations: FileImports = {
          react: {
            from: "react",
            default: "React",
          }
        }
        let targetFile = tempDir + middleDir + functionName + ext
        let file = project.createSourceFile(targetFile, undefined, {overwrite: true})

        let targetFunction = elementConfig.node;
        let realLimitlessComponent = targetFunction.isAsync() ?
          makeAsyncLimitilessFunction(functionName, `original${functionName}`, fullPath) :
          makeLimitilessFunction(functionName, `original${functionName}`, fullPath)

        scanForNeededDeclarations(targetFunction, file, declarations)
        file.addStatements(formatImports(declarations))
        file.addStatements(realLimitlessComponent.imports)
        file.addStatements("\n\n" + parseMethodText(targetFunction, file, `original${functionName}`))
        file.addStatements(realLimitlessComponent.code)

        file.save()
        console.log(`processed [${functionName}] in`, Date.now() - now)

      }

      routingFileImports += `import { Lazy_${functionName} } from "./index";\n`
      indexFileExports += `export const Lazy_${functionName} = React.lazy(() => import("${relativeFilePath}"));\n`
      allMethodRoutesRouting += `'${fullPath}': {path: '${fullPath}', element: ${elementConfig.element}},`
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
