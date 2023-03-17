import fs from 'fs'
import path from 'path'
import {
  Configuration,
  Decorators,
  Delete,
  FilterType,
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
import {Children} from "react";

export interface LimitlessResource {
  path: string,
  name: string,
  node: ClassDeclaration,
  apis: Record<string, ApiConfiguration>
}

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

let LimitlessClassAPIDecorators = {
  [Resource.name]: true,
  [Configuration.name]: true,
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

export type LimitlessConfig = {
  filters: FilterType[],
  routes: Record<string, LimitlessRouteConfig>,
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

  let apis = scanMethodsForApi(cls.getMethods(), resourcePath)
  return apis;
}

type LimitlessApi = {
  path: string,
  element: string,
  moduleName: string,
  modulePath: string,

  children?: Record<string, LimitlessApi>
}

function performExtractionOnApi(rootDir: string, project: Project, methodApi: MethodApi, api: LimitlessApi) {
  registerMethod(
    rootDir,
    project,
    api.moduleName.split("_")[0],
    methodApi.node,
    "src/.limitless",
    methodApi
  );
}

export function configureLimitlessApp(rootDir: string, project: Project, config: { resources: Record<string, MethodApis>, filters: [] }) {
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

  // console.log(flatRouting)
  // console.log(flatRouting['Get_/'].children)
  // console.log(Object.keys(flatRouting), Object.values(flatRouting))
  // console.log(JSON.stringify(flatRouting, null, 2))

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

export function scanAndProcessCapabilities(
  rootDir: string,
  project: Project,
  classConfig: LimitlessResource,
  outDir: string,
): Record<string, ApiConfiguration> | undefined {

  let output: Record<string, ApiConfiguration> = {}
  let classNode = classConfig.node


  for (let method of classNode.getMethods()) {
    let hasFrameworkDecorators = false

    let apiConfig: ApiConfiguration = {
      decorators: {},
      name: method.getName(),
    }

    for (let decorator of method.getDecorators()) {
      if (parseDecorator(decorator, classConfig, apiConfig)) {
        hasFrameworkDecorators = true
      }
    }

    if (hasFrameworkDecorators) {
      registerMethod(
        rootDir,
        project,
        classNode.getName(),
        method,
        outDir,
        apiConfig,
      )
      output[method.getName()] = apiConfig
    }
  }
  return Object.keys(output).length > 0 ? output : undefined
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


export function parseProjectResources(resources: ResourceDef[]) {
  let output: LimitlessResource[] = []
  for (let resource of resources) {
    let config = resource.decorator.getArguments()[0];
    let path = '"/"'
    if (config.getKind() === SyntaxKind.ObjectLiteralExpression) {
      path = getProperty(config as ObjectLiteralExpression, 'path')
    }
    path = JSON.parse(path)

    output.push({
      path,
      apis: {},
      // resource,
      node: resource.node,
      name: resource.node.getName(),
    })
  }
  return output;
}

export function getResourceClasses(sourceFile: SourceFile): LimitlessResource[] {
  let classes = sourceFile.getClasses()
  let output: LimitlessResource[] = []

  for (let cls of classes) {
    let resourceDecorator = cls.getDecorator('Resource');
    if (resourceDecorator) {
      let args = resourceDecorator.getArguments();
      let configArg = args[0];

      if (configArg.getKind() === SyntaxKind.ObjectLiteralExpression) {
        let path = getProperty(configArg as ObjectLiteralExpression, 'path')
        if (path) {
          output.push({
            apis: {},
            node: cls,
            name: cls.getName(),
            path: JSON.parse(path)
          })
        }
      }
      resourceDecorator.remove()
    }
  }
  return output;
}


export type ApiConfiguration = {
  name: string,
  path?: string,
  fullPath?: string,
  moduleName?: string,
  modulePath?: string,

  decorators: {
    Get?: { path?: string }
    Put?: { path?: string }
    Post?: { path?: string }
    Patch?: { path?: string }
    Delete?: { path?: string }
    Render?: { config?: string }
  }
}

export interface DecoratorConfigured {
  name: string,
  path?: string,
  fullPath?: string,
  modulePath?: string,
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
  return `
// ROUTE PATH = ${routePath}
export default function ${functionName}({context}) {
  return ${originalFunctionName}(context || {})
}`
}

function makeAsyncLimitilessFunction(
  functionName: string,
  originalFunctionName: string,
  routePath: string
) {
  return `
// ROUTE = ${routePath}
import { Use, SuspenseWrapper } from "../../runtime"
export default function ${functionName}({context}) {
  return (
    <SuspenseWrapper fallback="loading data">
        <Use componentKey="${functionName}" component={${originalFunctionName}} context={context} />
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

  let extension = hasRender ? "tsx" : "tsx"
  let filePath = path.join(dirName, `${className}_${method.getName()}.${extension}`);
  let sourceFile = project.createSourceFile(filePath, undefined, {overwrite: true})

  // if (hasRender) {
    addCodeToFile(sourceFile, `import * as React from "react"`)
  // }
  console.log('___________________', sourceFile.getFilePath(), apiConfig.decorators)
  moveDeclarationsToFile(method, sourceFile)
  cloneFunctionIntoFile(method, sourceFile, `original${method.getName()}`)
  addCodeToFile(
    sourceFile,
    method.isAsync() ?
      makeAsyncLimitilessFunction(`${className}_${methodName}`, `original${methodName}`, apiConfig.fullPath) :
      makeLimitilessFunction(`${className}_${methodName}`, `original${methodName}`, apiConfig.fullPath)
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

function getString(api: LimitlessApi): string {
  let str = ''
  console.log('in', api)
  if (api.path) {
      str += `{path: '${api.path}', element: ${api.element},`;
    if (api.children) {
      str += `children: [${Object.values(api.children).map(getString).join(",")}]`
    }
      str += '},'
  } else if (api.children) {
    str += `${Object.values(api.children).map(getString).join("")},`
  }
  return str;
}
function getImports(api: LimitlessApi): {} {
  let imports = '';
  if (api.moduleName) {
    imports = `import { Lazy_${api.moduleName} } from "${api.modulePath}";\n`;
  }
  return !api.children ? imports : `${imports}${Object.values(api.children).map(getImports).join("")}`
}

export function constructClientSideApp(appConfig: Record<string, LimitlessApi>) {
  let importsString = `import { Application } from "../runtime";\n`
  let routing = `let router = createBrowserRouter([`

  let gets: LimitlessApi = appConfig[`${Get.name}_/`];
  if (gets) {
    importsString += getImports(gets)
    routing += getString(gets)
  }
  routing += '])'


  return `import * as React from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom"
${importsString}
${routing}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <Application>
      <RouterProvider router={router} />
    </Application>
  </React.StrictMode>
)
  `
}
