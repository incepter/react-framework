import fs from 'fs'
import path from 'path'
import {
  Decorators,
  Delete,
  Get,
  Patch,
  Post,
  Put,
  Render
} from "../src/decorators";
import {
  ClassDeclaration, Decorator, MethodDeclaration,
  ObjectLiteralExpression, Project,
  PropertyAssignment,
  SourceFile, SyntaxKind
} from "ts-morph";

export interface ResourceMethod {
  name: string;
  decorator: string;
  path?: string;
}

export interface LimitlessResource {
  path: string,
  name: string,
  sourceFile: SourceFile,
  node: ClassDeclaration,
  capabilities: Record<string, Record<string, DecoratorConfig>>
}

export function getProperty(
  obj: ObjectLiteralExpression, prop: string): string | undefined {
  if (!obj) {
    return
  }
  let pathProp = obj.getProperty(prop) as PropertyAssignment | undefined;
  return pathProp.getInitializer()?.getText()
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
            node: cls,
            sourceFile,
            capabilities: {},
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

export interface DecoratorConfig {
  name: string,
  kind: string,
  path: string
}

export function parseDecorator(decorator: Decorator): DecoratorConfig | undefined {
  let output = undefined;
  let name = decorator.getName()
  if (Decorators[name]) {
    switch (name) {
      case Render.name: {
        output = {
          name,
          path: "",
          kind: "render",
        }
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
          if (pathArg) {
            path = pathArg
          }
        }
        output = {
          name,
          kind: "api",
          path: JSON.stringify(path)
        }
        break;
      }
      // case PreAuthorize.name: {
      //
      // }
    }
    decorator.remove()
  }
  return output;
}

function registerMethod(
  rootDir: string,
  project: Project,
  className: string,
  method: MethodDeclaration,
  outDir: string,
  capabilities: Record<string, DecoratorConfig>
) {

  let methodName = method.getName();
  let dirName = `${outDir}/${className}`;
  fs.mkdirSync(dirName, {recursive: true});

  let extension = capabilities[Render.name] ? "tsx" : "ts"
  let filePath = path.join(dirName, `${className}_${method.getName()}.${extension}`);
  let sourceFile = project.createSourceFile(filePath, undefined, {overwrite: true})

  sourceFile.addStatements([
    `import * as React from "react"`
  ])
  let importedModules = new Map<string, { importText: any, resolvedModuleSpecifier: any }>();
  method.getDescendantsOfKind(SyntaxKind.Identifier).forEach(identifier => {
    let symbol = identifier.getSymbol();
    if (symbol) {
      let declarations = symbol.getDeclarations();
      declarations.forEach(declaration => {
        let importDeclaration = declaration.getFirstAncestorByKind(SyntaxKind.ImportDeclaration);
        if (importDeclaration) {
          let originalFile = method.getSourceFile()
          let diff = sourceFile.getRelativePathTo(originalFile)


          let isRelative = !!importDeclaration.getModuleSpecifierSourceFile()
          let moduleSpecifier = importDeclaration.getModuleSpecifierValue();
          let resolvedModuleSpecifier = isRelative ? sourceFile.getRelativePathAsModuleSpecifierTo(
            importDeclaration.getModuleSpecifierSourceFile()?.getFilePath() ?? importDeclaration.getModuleSpecifierValue()
          ) : importDeclaration.getModuleSpecifierValue()

          let namespaceImport = importDeclaration.getNamespaceImport()?.getText();

          sourceFile.addImportDeclaration({
            defaultImport: importDeclaration.getDefaultImport()?.getText(),
            namespaceImport: namespaceImport ? namespaceImport.substring(namespaceImport.lastIndexOf(' as ') + 4) : undefined,
            namedImports: importDeclaration.getNamedImports()?.map(t => t.getName()),
            moduleSpecifier: resolvedModuleSpecifier
          });
        }
      });
    }
  });


  let functionNode = sourceFile.addFunction({
    name: `original${methodName}`,
    parameters: method.getParameters().map(param => ({
      name: param.getName(),
      type: param.getType().getText()
    })),
    returnType: method.getReturnType().getText(),
    statements: method.getStatements().map(stmt => stmt.getText())
  });
  sourceFile.addStatements([
    `
export default function ${className}_${methodName}(ctx) {
  return original${methodName}(ctx);
}
    `
  ])
  sourceFile.saveSync()
  let componentName = `Lazy${className}_${methodName}`;
  let textToAppend = capabilities[Render.name] ?
    `\nexport let ${componentName} = React.lazy(() => import("./${className}/${className}_${methodName}"));`
    :
    `\nexport { default as ${componentName} } from "./${className}/${className}_${methodName}";`

  fs.appendFileSync(
    `${outDir}/index.ts`,
    textToAppend
  );


  // let importedModules = functionNode.getImportDeclarations().map(declaration => declaration.getModuleSpecifierValue());
  // for (let importedModule of importedModules) {
  //   destFile.addImportDeclaration({
  //     moduleSpecifier: importedModule
  //   });
  // }


}

export function scanAndProcessCapabilities(
  rootDir: string,
  project: Project,
  classConfig: LimitlessResource,
  outDir: string
): Record<string, Record<string, DecoratorConfig>> {
  let caps: Record<string, Record<string, DecoratorConfig>> = {}

  let classNode = classConfig.node
  for (let method of classNode.getMethods()) {
    let hasCaps = false
    let capabilities: Record<string, DecoratorConfig> = {}

    for (let decorator of method.getDecorators()) {
      let cap = parseDecorator(decorator)
      if (cap) {
        hasCaps = true
        capabilities[cap.name] = cap
      }
    }
    if (hasCaps) {
      caps[method.getName()] = capabilities
      registerMethod(
        rootDir,
        project,
        classNode.getName(),
        method,
        outDir,
        capabilities
      )
    }
  }
  return caps
}
