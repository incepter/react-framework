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
  SyntaxKind
} from "ts-morph";
import {addCodeToFile} from "./file-utils";

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

type LimitlessFile = {
  resources: ResourceDef[],
  configurations: ResourceDef[],
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

export function parseDecorator(
  decorator: Decorator,
  classConfig: LimitlessResource,
  result: ApiConfiguration
): DecoratorConfigured | undefined {
  let output = undefined;
  let name = decorator.getName()

  if (Decorators[name]) {
    switch (name) {
      case Render.name: {
        output = {}
        result.decorators.Render = {}
        decorator.remove()
        break;
      }
      case Get.name:
      case Post.name:
      case Delete.name:
      case Patch.name:
      case Put.name: {
        let args = decorator.getArguments();
        let configArg = args[0];

        let path = '"/"';
        if (configArg && configArg.getKind() === SyntaxKind.ObjectLiteralExpression) {
          let pathArg = getProperty(configArg as ObjectLiteralExpression, 'path')
          if (typeof pathArg === "string") {
            path = pathArg
          }
        }

        path = JSON.parse(path)
        result.path = path;
        result.fullPath = `${classConfig.path}${path}`
        result.decorators[name] = {}
        decorator.remove()
        output = {}
        break;
      }
      case PreAuthorize.name: {
        result.name = name;
        output = {}
        decorator.remove()
        break;
      }
    }
  }
  return output;
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
          let originalFile = method.getSourceFile()
          let diff = targetFile.getRelativePathTo(originalFile)

          let isRelative = !!importDeclaration.getModuleSpecifierSourceFile()
          let moduleSpecifier = importDeclaration.getModuleSpecifierValue();
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
        <Use key="${functionName}" component={${originalFunctionName}} context={context} />
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
  apiConfig: ApiConfiguration,
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
      makeAsyncLimitilessFunction(`${className}_${methodName}`, `original${methodName}`, apiConfig.fullPath) :
      makeLimitilessFunction(`${className}_${methodName}`, `original${methodName}`, apiConfig.fullPath)
  )

  sourceFile.saveSync()
  let componentName = `Lazy${className}_${methodName}`;
  let textToAppend = hasRender ?
    `\nexport let ${componentName} = React.lazy(() => import("./${className}/${className}_${methodName}"));`
    :
    `\nexport { default as ${componentName} } from "./${className}/${className}_${methodName}";`

  fs.appendFileSync(
    `${outDir}/index.ts`,
    textToAppend
  );
  apiConfig.moduleName = componentName
  apiConfig.modulePath = `./index`
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

export function constructClientSideApp(appConfig: LimitlessResource[]) {
  let importsString = `import { Application } from "../runtime";\n`
  let routing = `let router = createBrowserRouter([`

  appConfig.forEach(current => {
    Object.values(current.apis).forEach(api => {
      if (typeof api.path === "string" && api.moduleName && api.modulePath) {
        importsString += `import { ${api.moduleName} } from "${api.modulePath}";\n`;
        routing += `{ path: "${api.fullPath}", element: <${api.moduleName} /> },`
      }
    })
  })
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
