import * as path from 'path';
import * as ts from 'typescript';
import {getResourceDecoratorFromClass, processNode} from "./me";


function reactLimitlessTransformer(context: ts.TransformationContext) {
  function visit(node: ts.Node): ts.Node {
    if (ts.isClassDeclaration(node)) {
      console.log('__found a class')
      let config = getResourceDecoratorFromClass(node, node.getSourceFile())
      if (config) {
        console.log('class processed:', config)
      }
    }
    return ts.visitEachChild(node, visit, context);
  }

  return (node: ts.SourceFile) => {
    return ts.visitNode(node, visit);
  }
}

let rootDirectory = path.resolve(__dirname, '..');
let tsConfigFile = path.join(rootDirectory, 'tsconfig.json');
let configFileName = "tsconfig.json";
let configFile = ts.readConfigFile(configFileName, ts.sys.readFile);
let compilerOptions = ts.convertCompilerOptionsFromJson(configFile.config.compilerOptions, process.cwd()).options;
let host = ts.createCompilerHost(compilerOptions);
// @ts-ignore
const parsedCommandLine = ts.getParsedCommandLineOfConfigFile(tsConfigFile, {}, ts.sys)!;

let program = ts.createProgram({
  host,
  options: parsedCommandLine.options,
  rootNames: parsedCommandLine.fileNames,
});

// let program = ts.createProgram({
//   host,
//   options: compilerOptions,
//   rootNames: configFile.config.include,
// });

let transformers: ts.CustomTransformers = {
  before: [reactLimitlessTransformer]
};

let {
  emitSkipped,
  diagnostics
} = program.emit(undefined, undefined, undefined, undefined, transformers);

if (emitSkipped) {
  console.error('Compilation failed');
  process.exit(1);
}

diagnostics.forEach(diagnostic => {
  console.error(diagnostic.messageText);
});


// for (let sourceFile of program.getSourceFiles()) {
//   console.log('__')
//   if (!sourceFile.isDeclarationFile) {
//     // findAllResources(sourceFile);
//     // findNodesWithCustomDecorator(sourceFile);
//   }
// }


