import path from 'path'
import {
  Decorators,
  Delete,
  Get,
  Patch,
  Post,
  PreAuthorize,
  Put,
  Render,
  UseServer
} from "../src/decorators";
import {
  Decorator,
  Identifier,
  MethodDeclaration,
  ObjectLiteralExpression,
  PropertyAssignment,
  SourceFile,
  SyntaxKind,
} from "ts-morph";

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
