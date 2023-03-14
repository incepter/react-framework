import {Plugin} from 'vite'
import * as ts from "typescript"
import {
  ClassDeclaration, Decorator,
  ObjectLiteralExpression,
  Project,
  PropertyAssignment,
  SourceFile, SyntaxKind
} from 'ts-morph'
import { transformSync } from 'esbuild'
import {
  Decorators,
  Delete,
  Get, Patch,
  Post, PreAuthorize, Put,
  Render,
  Resource
} from "../src/decorators";

interface ResourceMethod {
  name: string;
  decorator: string;
  path?: string;
}

interface FunctionDeclarationConfig  {
  path: string,
  name: string,
  sourceFile: SourceFile,
  node: ClassDeclaration,
  capabilities: Record<string, Record<string, DecoratorConfig>>
}

function getProperty(obj: ObjectLiteralExpression, prop: string): string | undefined {
  if (!obj) {
    return
  }
  let pathProp = obj.getProperty(prop) as PropertyAssignment | undefined;
  return pathProp.getInitializer()?.getText()
}


function getResourceClasses(sourceFile: SourceFile): FunctionDeclarationConfig[] {
  let classes = sourceFile.getClasses()
  let output: FunctionDeclarationConfig[] = []

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

interface DecoratorConfig {name: string, kind: string, path: string}

function parseDecorator(decorator: Decorator): DecoratorConfig | undefined {
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

function scanCapabilities(classConfig: FunctionDeclarationConfig): Record<string, Record<string, DecoratorConfig>> {
  let caps: Record<string, Record<string, DecoratorConfig>> = {}
  for (let method of classConfig.node.getMethods()) {
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
    }
  }
  return caps
}

/** @type {import('vite').UserConfig} */
export default function transformTsMorph(): Plugin {
  let project: Project;
  let config: FunctionDeclarationConfig[] = []

  return {
    name: 'resource-plugin',
    async configResolved(config) {
      project = new Project();
      project.addSourceFilesAtPaths(config.root + '/src/**/*.tsx');
    },
    async transform(code, id) {
      // console.log('___________got ', id)
      if (!id.endsWith('.tsx')) {
        return null;
      }

      let sourceFile = project.getSourceFile(id)
      let classesConfig = getResourceClasses(sourceFile)
      if (classesConfig.length > 0) {
        for (let classConfig of classesConfig) {
          classConfig.capabilities = scanCapabilities(classConfig)
          config.push(classConfig)
        }
      }
    },
    // generateBundle(_, bundle) {
    //   console.log('generating bundle', config)
    // }

    // async buildStart() {
    //   project = new Project({
    //     tsConfigFilePath: 'tsconfig.json',
    //   });
    //   project.addSourceFilesAtPaths(project.getCompilerOptions().rootDir ?? []);
    //   project.addDirectoryAtPath('src');
    //
    //
    //   let sourceFiles = await project.addSourceFilesAtPaths('src/**/*.tsx');
    //   sourceFiles.forEach((sourceFile) => {
    //     console.log('____________________________okko__________________________', sourceFile.getFilePath())
    //     // Make sure to watch the files for changes
    //     this.addWatchFile(sourceFile.getFilePath());
    //   });
    // },
    // resolveId() {
    //   console.log('_________________resolveId_________________')
    // },
    // configResolved() {
    //   console.log('_________________config resolved_________________')
    // },
    // async resolveDynamicImport(id, im) {
    //   console.log('_________________dynamic import_________________')
    // },
    // async load(id: string) {
    //   console.log('_________________load_________________')
    //   if (!/\.tsx?$/.test(id)) {
    //     return null;
    //   }
    //   console.log('___loading', /\.tsx?$/.test(id), id)
      // console.log('found a file', id)

      // let code = await this.load(id);
      //
      // let project = new Project();
      // let sourceFile = project.createSourceFile('module.tsx', code);
      //
      // // Verify that the file contains a class decorated with @Resource
      // let resourceClass = sourceFile.getClasses().find(cls => {
      //   let resourceDecorator = cls.getDecorators().find(decorator => decorator.getName() === 'Resource');
      //   return resourceDecorator !== undefined;
      // });
      // if (!resourceClass) {
      //   // If the file does not contain a class decorated with @Resource, return the original code
      //   return code;
      // }
      //
      // // Manipulate the AST using ts-morph
      // resourceClass.forEachChild((node) => {
      //   // Modify the AST as needed
      // });
      //
      // // Generate the new source code
      // let newCode = sourceFile.getFullText();
      //
      // return newCode;


    // },
    // async buildStart() {
    //   let configPath = ts.findConfigFile(
    //     /*searchPath*/ './',
    //     ts.sys.fileExists,
    //     'tsconfig.json'
    //   );
    //   if (!configPath) {
    //     throw new Error('Could not find a valid tsconfig.json.');
    //   }
    //
    //   let configFile = ts.readConfigFile(configPath, ts.sys.readFile);
    //   let compilerOptions = ts.parseJsonConfigFileContent(
    //     configFile.config,
    //     ts.sys,
    //     './'
    //   ).options;
    //
    //   let program = ts.createProgram({
    //     rootNames: ['src/index.tsx'], // or wherever your entry file is located
    //     options: compilerOptions,
    //   });
    //
    //   let sourceFiles = program.getSourceFiles().filter(
    //     (sourceFile) =>
    //       !sourceFile.isDeclarationFile &&
    //       !sourceFile.fileName.endsWith('.d.ts')
    //   );
    //
    //   // Find all classes with the @Resource decorator
    //   let project = new Project();
    //   for (let sourceFile of sourceFiles) {
    //     let sourceFilePath = sourceFile.getSourceFilePath();
    //     let file = project.addExistingSourceFile(sourceFilePath);
    //     file.getClasses().forEach((classDeclaration) => {
    //       let resourceDecorator = classDeclaration.getDecorator('Resource');
    //       if (resourceDecorator) {
    //         let className = classDeclaration.getName() || 'UnknownClass';
    //         let methods: ResourceMethod[] = [];
    //         classDeclaration.getMethods().forEach((methodDeclaration) => {
    //           console.log('==> Found A File', className, sourceFilePath)
    //         });
    //         resourceMethods[className] = methods;
    //       }
    //     });
    //   }
    // },
    //
    // async transform(code: string, id: string): Promise<string> {
    //   // Only process TypeScript files
    //   if (!/\.tsx?$/.test(id)) {
    //     return code;
    //   }
    //
    //   let className = id
    //     .replace(/\\/g, '/')
    //     .replace(/^.*\/src\//, '')
    //     .replace(/\.[^/.]+$/, '');
    //   let methods = resourceMethods[className];
    //
    //   if (methods && methods.length > 0) {
    //     let outputCode: string[] = [];
    //     let sourceFile = ts.createSourceFile(
    //       id,
    //       code,
    //       ts.ScriptTarget.Latest,
    //       /*setParentNodes*/ true
    //     );
    //
    //     // Extract methods with the specified decorators
    //     sourceFile.forEachChild((node) => {
    //       if (
    //         ts.isClassDeclaration(node) &&
    //         node.decorators &&
    //         node.name?.getText() === className
    //       ) {
    //         node.members.forEach((member) => {
    //           if (
    //             ts.isMethodDeclaration(member) &&
    //             member.decorators &&
    //             methods.some((method) =>
    //               member.decorators.some(
    //                 (decorator) =>
    //                   decorator.expression.getText() === method.decorator
    //               )
    //             )
    //           ) {
    //             // Add the method to the output code
    //             outputCode.push(
    //               `export ${member.getText()}`
    //             );
    //
    //             // Remove the method from the source file
    //             sourceFile.statements = ts.createNodeArray(
    //               sourceFile.statements.filter((statement) => statement !== member)
    //             );
    //           }
    //         });
    //       }
    //     });
    //
    //     if (outputCode.length > 0) {
    //       // Write the extracted methods to separate files
    //       for (let method of methods) {
    //         let methodName = method.name.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
    //         let filePath = `./${className}-${methodName}.tsx`;
    //
    //         let fileContent = `import React from 'react';\n`;
    //         if (method.path) {
    //           fileContent += `export let path = '${method.path}';\n`;
    //         }
    //         fileContent += outputCode.join('\n');
    //
    //         this.emitFile({
    //           type: 'asset',
    //           fileName: filePath,
    //           source: fileContent,
    //         });
    //       }
    //     }
    //   }
    //
    //   return code;
    // }
    //
    // transform(code, id) {
    //   if (!/\.(js|ts|jsx|tsx)$/.test(id)) {
    //     return {code, map: null};
    //   }
    //
    //   // console.log('found a file', id)
    //   // console.log('processing', id)
    //
    //   let sourceFile = project.getSourceFile(id);
    //
    //
    //   if (sourceFile) {
    //     let resourceClasses = sourceFile.getClasses().filter(cls =>
    //       cls.getDecorator('Resource'),
    //     );
    //     for (let cls of resourceClasses) {
    //       let methods = cls.getMethods().filter(method =>
    //         ['Get', 'Post', 'Render'].some(decName => method.getDecorator(decName)),
    //       );
    //       for (let method of methods) {
    //         // Do something with the method here
    //         console.log(`Found ${method.getName()} in ${cls.getName()} with @${method.getDecorators()[0].getName()} decorator`);
    //       }
    //     }
    //   }
    //   return null;
    // },
  };

}

