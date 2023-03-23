import fs from 'fs'
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
  Render,
  Resource, UseServer
} from "../src/decorators";
import {
  ClassDeclaration,
  Decorator, FunctionDeclaration,
  MethodDeclaration,
  ObjectLiteralExpression,
  Project,
  PropertyAssignment,
  SourceFile,
  SyntaxKind, Node, Identifier, ImportDeclaration,
} from "ts-morph";

export function getProperty(
  obj: ObjectLiteralExpression, prop: string): string | undefined {
  if (!obj) {
    return
  }
  let pathProp = obj.getProperty(prop) as PropertyAssignment | undefined;
  return pathProp.getInitializer()?.getText()
}


type ResourceDef = {
  decorator: Decorator,
  node: ClassDeclaration,
}

export type LimitlessFile = {
  resources: ResourceDef[],
  configurations: ResourceDef[],
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

export type MethodApis = Record<string, MethodApi>
type MethodApi = {
  name: string,
  method: string,
  routePath: string,
  shortPath: string,
  node: MethodDeclaration,
  decorators: {
    Get?: boolean,
    Put?: boolean,
    Post?: boolean,
    Patch?: boolean,
    Delete?: boolean,
    Render?: boolean,
    UseServer?: boolean,
  }
}

function scanMethodsForApi(
  methods: MethodDeclaration[], basePath: string): MethodApis {
  let flatRouting = {}
  let methodAPIs: MethodApis = {}
  let hasFrameworkAPIs = false;
  // console.log(`processing methods of file ${methods[0]?.getSourceFile().getFilePath()}`)
  for (let method of methods) {
    for (let decorator of method.getDecorators()) {
      let result = parseDecorator(decorator);
      if (result) {
        let methodName = method.getName();
        if (!methodAPIs[methodName]) {
          methodAPIs[methodName] = {
            method: Get.name,
            routePath: null,
            shortPath: null,
            node: method,
            name: methodName,
            decorators: {
              [result.decoratorName]: true,
            }
          }
        }
        let routeMethod: string | null = typeof result.path === "string" ? result.decoratorName : null;
        let isRoute = routeMethod !== null;
        if (isRoute) {
          methodAPIs[methodName].method = routeMethod;
          methodAPIs[methodName].shortPath = result.path;
          methodAPIs[methodName].routePath = `${basePath}${result.path}`;
          // console.log(`[[API] Found API route of type ${routeMethod} and path ${methodAPIs[methodName].routePath}]`)
          methodAPIs[methodName].decorators[result.decoratorName] = true;
          flatRouting[methodAPIs[methodName].routePath] = methodAPIs[methodName];
        } else {
          methodAPIs[methodName].decorators[result.decoratorName] = true;
        }
      }
      if (result) {
        hasFrameworkAPIs = true
      }
    }
  }

  console.log('flat routing is', flatRouting)
  return hasFrameworkAPIs ? methodAPIs : null
}

function resolveApiFromResource(resource: ResourceDef) {
  let cls = resource.node;
  let resourcePath = getPathFromDecorator(resource.decorator)

  return scanMethodsForApi(cls.getMethods(), resourcePath);
}

export type LimitlessApi = {
  path: string,
  element: string,
  moduleName: string,
  modulePath: string,

  children?: Record<string, LimitlessApi>
}

function performExtractionOnApi(
  rootDir: string, project: Project, methodApi: MethodApi, api: LimitlessApi) {
  registerMethod(
    rootDir,
    project,
    api.moduleName.split("_")[0],
    methodApi.node,
    "src/.limitless",
    methodApi
  );
}

export function configureLimitlessApp(
  rootDir: string, project: Project,
  config: { resources: Record<string, MethodApis>, filters: [] }
) {
  let flatRouting: Record<string, LimitlessApi> = {}

  for (let [resourceName, resourceApis] of Object.entries(config.resources)) {
    for (let [apiName, api] of Object.entries(resourceApis)) {
      let {method, routePath} = api;
      let current: Record<string, LimitlessApi> = flatRouting
      let fragments = routePath.split("/");

      for (let i = 0, {length} = fragments; i < length; i += 1) {
        let fragment = fragments[i]
        let hasNext = i !== (length - 1)
        let routeName = `${method}_/${fragment}`

        if (!hasNext && fragment === "" && current[routeName]?.path === "/") {
          let moduleName = `${resourceName}_${apiName}`
          current[routeName].path = fragment;
          current[routeName].element = `<Lazy_${moduleName} />`;
          current[routeName].moduleName = moduleName;
          current[routeName].modulePath = "./index";


          performExtractionOnApi(rootDir, project, api, current[routeName])

          continue;
        }

        if (!current[routeName]) {
          // @ts-ignore
          current[routeName] = {}
        }
        if (hasNext) {
          if (!current[routeName].children) {
            current[routeName].children = {}
          }
          current = current[routeName].children
        } else {
          let moduleName = `${resourceName}_${apiName}`
          current[routeName].path = fragment;
          current[routeName].element = `<Lazy_${moduleName} />`;
          current[routeName].moduleName = moduleName;
          current[routeName].modulePath = "./index";
          performExtractionOnApi(rootDir, project, api, current[routeName])

        }
      }
    }
  }

  return flatRouting
}

export function parseProjectAPI(targetedFiles: { sourceFile: SourceFile, limitlessAPI: LimitlessFile }[]) {
  let output: { resources: Record<string, MethodApis>, filters: [] } = {
    resources: {}, filters: []
  }
  for (let fileApi of targetedFiles) {
    let {limitlessAPI: {resources, configurations}} = fileApi

    if (resources.length) {
      for (let resource of resources) {
        let result = resolveApiFromResource(resource);
        if (result) {
          let resourceName = resource.node.getName();
          output.resources[resourceName] = result
        }
      }
    }
    if (configurations.length) {

    }
  }
  return output
}

export function getLimitlessAPIFromFile(sourceFile: SourceFile): LimitlessFile {
  let classes = sourceFile.getClasses()
  let resources: ResourceDef[] = []
  let configurations: ResourceDef[] = []

  for (let cls of classes) {
    for (let decorator of cls.getDecorators()) {
      if (decorator.getName() === Resource.name) {
        resources.push({node: cls, decorator})
        continue
      }
      if (decorator.getName() === Configuration.name) {
        configurations.push({node: cls, decorator})
      }
    }
  }

  return {
    resources,
    configurations,
  }
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

function visitNode(node: Node, visitor: (node: Node) => void): void {
  visitor(node);
  node.forEachChild(child => visitNode(child, visitor));
}

export function scanForNeededDeclarations(
  method: MethodDeclaration,
  targetFile: SourceFile,
  output: FileImports
) {
  // targetFile.getRelativePathAsModuleSpecifierTo(
  //   importDeclaration.getModuleSpecifierSourceFile()?.getFilePath() ?? importDeclaration.getModuleSpecifierValue()
  // )
  let methodText = method.getText();
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
            if (namespaceImport) {
              if (!current.namespace) {
                current.namespace = {}
              }
              current.namespace[namespaceImport] = true;
            }

            current.default = defaultImportName
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

export function parseMethodText(
  method: MethodDeclaration,
  sourceFile: SourceFile,
  functionName: string
) {

  let methodContent = method.getText().replace(method.getName(), functionName)
  return method.isAsync() ? methodContent.replace("async", "async function") : ("function " + methodContent)
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
        <UseAsyncComponent componentKey="${functionName}" component={${originalFunctionName}} />
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

let staticImports = `import * as React from "react";\nimport { Application, RunCSRApp } from "../runtime";\n\n`

export function constructClientSideApp(appConfig: Record<string, LimitlessApi>) {
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

RunCSRApp(routing);
`
}
