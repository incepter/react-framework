import * as ts from "typescript"
import {Decorators, PathDecorators, Resource} from "./decorators";

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


export function lookupResourceAPIs(
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

      let otherModifiers: ts.ModifierLike[] = []

      for (let modifier of member.modifiers) {
        if (ts.isDecorator(modifier)) {
          let expression = modifier.expression
          if (ts.isCallExpression(expression) && ts.isIdentifier(expression.expression)) {
            let name = expression.expression.escapedText as string;
            if (Decorators[name!]) {
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
            } else {
              otherModifiers.push(modifier)
            }
          }
        }
      }
      output.push(api)
      // @ts-ignore
      member.modifiers = otherModifiers
    }
  }
  return output;
}

export function getResourceDecoratorFromClass(node: ts.ClassDeclaration, sourceFile: ts.SourceFile): ResourceDeclaration | null {
  let {modifiers} = node
  if (!modifiers) {
    return null
  }

  let otherModifiers: ts.ModifierLike[] = []

  for (let modifier of modifiers) {
    if (ts.isDecorator(modifier)) {
      let expression = modifier.expression
      if (ts.isCallExpression(expression) && ts.isIdentifier(expression.expression)) {
        let name = expression.expression.escapedText as string
        if (name === Resource.name) {
          let path = extractProperty(modifier, "path", sourceFile);
          if (!path && PathDecorators[name!]) {
            path = "/"
          }

          // @ts-ignore
          node.modifiers = node.modifiers!.filter(t => t !== modifier)

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

export function processNode(node: ts.Node) {
  console.log('node', node)
  if (ts.isClassDeclaration(node)) {
    let config = getResourceDecoratorFromClass(node, node.getSourceFile())
    if (!config) {
      return;
    }

    // resources[config.path] = config
    console.log('class processed:', config)
    return config;
    // let declaredMappings = getDeclaredMappings(node, sourceFile)
    // let resourceMappings = inferResourceMappings(declaredMappings)
    //
    // removeInternalDecorators(node, declaredMappings)
    // registerResource(config, resourceMappings, sourceFile)
  }
}

export function findAllResources(sourceFile: ts.SourceFile) {
  let resources = {}
  ts.forEachChild(sourceFile, processNode)
  // console.log('finished', resources)
}
