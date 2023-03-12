import * as ts from "typescript"
import {Decorators, PathDecorators} from "./decorators";

type ResourceDeclaration = {
  path: string,
  config?: string,
  kind: "resource" | "api",
  children: ApiDeclaration[],
  // target: ts.ClassDeclaration,
}

type ApiDeclaration = {
  kind: "api",
  name: string,
  path?: string,
  method: string,
  config?: string,
  capabilities?: ApiCapability[]
  // target: ts.ClassElement,
}

type ApiCapability = {
  kind: string,
  config: string | undefined
}


function lookupResourceAPIs(
  parentPath: string,
  node: ts.ClassDeclaration,
  sourceFile: ts.SourceFile
) {
  let output: ApiDeclaration[] = []
  for (let member of node.members) {
    if (ts.isMethodDeclaration(member) && member.modifiers) {
      let api: ApiDeclaration = {
        kind: 'api',
        method: 'Get',
        capabilities: [],
        name: ts.getNameOfDeclaration(member)!.getText(sourceFile)
      }

      for (let modifier of member.modifiers) {
        if (ts.isDecorator(modifier)) {
          let expression = modifier.expression
          if (ts.isCallExpression(expression) && ts.isIdentifier(expression.expression)) {
            let name = expression.expression.escapedText;
            if (Decorators[name!]) {
              let path = extractProperty(modifier, "path", sourceFile);
              if (PathDecorators[name!]) {
                if (!path) {
                  path = "/"
                }
                api.method = name!;
                api.path = `${JSON.parse(parentPath)}${path === "/" ? "/" : JSON.parse(path)}`
              }
              api.capabilities!.push({
                kind: name!,
                config: expression.arguments[0]?.getFullText(sourceFile)
              })
            }
          }
        }
      }
      output.push(api)
    }
  }
  return output;
}

function getResourceDecoratorFromClass(node: ts.ClassDeclaration, sourceFile: ts.SourceFile): ResourceDeclaration | null {
  let {modifiers} = node
  if (!modifiers) {
    return null
  }
  for (let modifier of modifiers) {
    if (ts.isDecorator(modifier)) {
      let expression = modifier.expression
      if (ts.isCallExpression(expression) && ts.isIdentifier(expression.expression)) {
        let name = expression.expression.escapedText
        if (Decorators[name!]) {
          let path = extractProperty(modifier, "path", sourceFile);
          if (!path && PathDecorators[name!]) {
            path = "/"
          }
          return {
            path: JSON.parse(path!),
            // target: node,
            kind: "resource" as const,
            children: lookupResourceAPIs(path ?? "", node, sourceFile),
            config: expression.arguments[0].getFullText(sourceFile)
          }
        }
      }
    }
  }
  return null
}

function extractProperty(node: ts.Decorator, propName: string, src: ts.SourceFile) {
  let expression = node.expression
  if (ts.isCallExpression(expression) && ts.isIdentifier(expression.expression)) {
    let options = expression.arguments?.[0]
    if (options && ts.isObjectLiteralExpression(options)) {
      for (const property of options.properties) {
        if (ts.isPropertyAssignment(property) && ts.isIdentifier(property.name) && property.name.text === propName) {
          return property.initializer.getText(src);
        }
      }
    }
  }
  return undefined
}


export function findAllResources(sourceFile: ts.SourceFile) {
  let resources = {}
  ts.forEachChild(sourceFile, function walk(node: ts.Node): void {
    if (ts.isClassDeclaration(node)) {
      let config = getResourceDecoratorFromClass(node, sourceFile)
      if (!config) {
        return;
      }

      resources[config.path] = config
      console.log('class processed:', config)
      // let declaredMappings = getDeclaredMappings(node, sourceFile)
      // let resourceMappings = inferResourceMappings(declaredMappings)
      //
      // removeInternalDecorators(node, declaredMappings)
      // registerResource(config, resourceMappings, sourceFile)
    }
  })
  // console.log('finished', resources)
}
