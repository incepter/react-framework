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
  Resource
} from "../src/decorators";
import {
  ClassDeclaration,
  Decorator,
  MethodDeclaration,
  ObjectLiteralExpression,
  Project,
  PropertyAssignment,
  SourceFile,
  SyntaxKind,
} from "ts-morph";
import {addCodeToFile} from "./file-utils";

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

function getPathFromDecorator(
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
  }
}

function scanMethodsForApi(
  methods: MethodDeclaration[], basePath: string): MethodApis {
  let methodAPIs: MethodApis = {}
  let hasFrameworkAPIs = false;
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
          methodAPIs[methodName].decorators[result.decoratorName] = true;
        } else {
          methodAPIs[methodName].decorators[result.decoratorName] = true;
        }
      }
      if (result) {
        hasFrameworkAPIs = true
      }
    }
  }
  return hasFrameworkAPIs ? methodAPIs : null
}

function resolveApiFromResource(resource: ResourceDef) {
  let cls = resource.node;
  let resourcePath = getPathFromDecorator(resource.decorator)

  return scanMethodsForApi(cls.getMethods(), resourcePath);
}

type LimitlessApi = {
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
          output.resources[resource.node.getName()] = result
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

function moveDeclarationsToFile(
  method: MethodDeclaration,
  targetFile: SourceFile,
) {
  method.getDescendantsOfKind(SyntaxKind.Identifier).forEach(identifier => {
    let symbol = identifier.getSymbol();
    if (symbol) {
      let declarations = symbol.getDeclarations();
      declarations.forEach(declaration => {
        let importDeclaration = declaration.getFirstAncestorByKind(SyntaxKind.ImportDeclaration);
        if (importDeclaration) {

          let isRelative = importDeclaration.isModuleSpecifierRelative()
          let resolvedModuleSpecifier = isRelative ? targetFile.getRelativePathAsModuleSpecifierTo(
            importDeclaration.getModuleSpecifierSourceFile()?.getFilePath() ?? importDeclaration.getModuleSpecifierValue()
          ) : importDeclaration.getModuleSpecifierValue()

          let namespaceImport = importDeclaration.getNamespaceImport()?.getText();

          targetFile.addImportDeclaration({
            defaultImport: importDeclaration.getDefaultImport()?.getText(),
            namespaceImport: namespaceImport ? namespaceImport.substring(namespaceImport.lastIndexOf(' as ') + 4) : undefined,
            namedImports: importDeclaration.getNamedImports()?.map(t => t.getName()),
            moduleSpecifier: resolvedModuleSpecifier
          });
        }
      });
    }
  });

}

function cloneFunctionIntoFile(
  method: MethodDeclaration,
  sourceFile: SourceFile,
  functionName: string
) {
  return sourceFile.addFunction({
    name: functionName,
    isAsync: method.isAsync(),
    parameters: method.getParameters().map(param => ({
      name: param.getName(),
      type: param.getType().getText()
    })),
    returnType: method.getReturnType().getText(),
    statements: method.getStatements().map(stmt => stmt.getText())
  });
}

function makeLimitilessFunction(
  functionName: string,
  originalFunctionName: string,
  routePath: string
) {
  return `import { UseComponent, SuspenseWrapper } from "../../runtime"

// ROUTE = ${routePath}
export default function ${functionName}() {
  return (
    <SuspenseWrapper fallback="loading">
        <UseComponent component={${originalFunctionName}} />
    </SuspenseWrapper>
  )
}`
}

function makeAsyncLimitilessFunction(
  functionName: string,
  originalFunctionName: string,
  routePath: string
) {
  return `import { UseAsyncComponent, SuspenseWrapper } from "../../runtime"

// ROUTE = ${routePath}
export default function ${functionName}() {
  return (
    <SuspenseWrapper fallback="loading data">
        <UseAsyncComponent componentKey="${functionName}" component={${originalFunctionName}} />
    </SuspenseWrapper>
  )
}`
}


function registerMethod(
  rootDir: string,
  project: Project,
  className: string,
  method: MethodDeclaration,
  outDir: string,
  apiConfig: MethodApi,
) {
  let methodName = method.getName();
  let dirName = `${outDir}/${className}`;
  fs.mkdirSync(dirName, {recursive: true});

  let hasRender = !!apiConfig.decorators.Render

  let extension = hasRender ? "tsx" : "ts"
  let filePath = path.join(dirName, `${className}_${method.getName()}.${extension}`);
  let sourceFile = project.createSourceFile(filePath, undefined, {overwrite: true})

  if (hasRender) {
    addCodeToFile(sourceFile, `import * as React from "react"`)
  }
  moveDeclarationsToFile(method, sourceFile)
  cloneFunctionIntoFile(method, sourceFile, `original${method.getName()}`)
  addCodeToFile(
    sourceFile,
    method.isAsync() ?
      makeAsyncLimitilessFunction(`${className}_${methodName}`, `original${methodName}`, apiConfig.routePath) :
      makeLimitilessFunction(`${className}_${methodName}`, `original${methodName}`, apiConfig.routePath)
  )

  sourceFile.saveSync()
  let componentName = `Lazy_${className}_${methodName}`;
  let textToAppend = hasRender ?
    `\nexport let ${componentName} = React.lazy(() => import("./${className}/${className}_${methodName}"));`
    :
    `\nexport { default as ${componentName} } from "./${className}/${className}_${methodName}";`

  fs.appendFileSync(
    `${outDir}/index.ts`,
    textToAppend
  );
}

function getRoutingAsString(api: LimitlessApi, isTopLevel = false): string {

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
        result += `[${content}]`
      }
    }
    if (didAddElement) {
      result += "}"
    }

    return result
  }
}

function getImports(api: LimitlessApi): {} {
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
