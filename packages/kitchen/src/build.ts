import * as ts from 'typescript';
import {findAllResources} from "./me";

// Read the tsconfig.json file
const entry = "src/new/newIndex.tsx";
const configFileName = "tsconfig.json";
const configFile = ts.readConfigFile(configFileName, ts.sys.readFile);

// Define the custom decorator name to detect
const classDecorators = ['Resource'];
const functionDecorators = ['Render', 'GetMapping', 'PreAuthorize'];

// Load the tsconfig.json file
// const configFile = ts.readConfigFile(configFileName, ts.sys.readFile);
const compilerOptions = ts.convertCompilerOptionsFromJson(
  configFile.config.compilerOptions,
  process.cwd()
).options;


// Create the program using the compiler options and file names from the tsconfig.json file
const fileNames = configFile.config.include;
const program = ts.createProgram([entry], compilerOptions);

// Find all nodes with the custom decorator and log their location
function findNodesWithCustomDecorator(sourceFile: ts.SourceFile) {
  ts.forEachChild(sourceFile, function walk(node: ts.Node): void {
    if (ts.isClassDeclaration(node)) {
      let decorators = node.modifiers?.filter(t => t.kind === ts.SyntaxKind.Decorator);
      if (decorators) {
        let matchingDecorators = decorators.filter(decorator => {
          if (ts.isDecorator(decorator)) {
            let name = getDecoratorName(decorator, sourceFile);
            if (name) {
              return classDecorators.includes(name)
            }
          }
          return false;
        });
        if (matchingDecorators.length > 0) {
          // @ts-ignore
          // console.log(`${sourceFile.fileName}: has ${matchingDecorators.length} matches`, matchingDecorators[0].expression.expression);
        }
      }
    } else if (ts.isMethodDeclaration(node)) {
      let decorators = node.modifiers?.filter(t => t.kind === ts.SyntaxKind.Decorator);
      if (decorators) {
        let matchingDecorators = decorators.filter(decorator => {
          if (ts.isDecorator(decorator)) {
            let name = getDecoratorName(decorator, sourceFile);
            if (name) {
              return functionDecorators.includes(name)
            }
          }
          return false;
        });
        if (matchingDecorators.length > 0) {
          // @ts-ignore
          console.log(`${sourceFile.fileName}: has ${matchingDecorators.length} matches`, matchingDecorators.map(t => getDecoratorName(t, sourceFile)));
        }
      }
    }
    ts.forEachChild(node, walk);
  });
}

function getDecoratorName(decorator: ts.Decorator, sourceFile) {
  let expression = decorator.expression;
  if (ts.isIdentifier(expression)) {
    return expression.getText(sourceFile);
  } else if (ts.isCallExpression(expression)) {
    return expression.expression.getText(sourceFile);
  }
  return null
}

// Find all nodes with the custom decorator in each source file in the program

for (const sourceFile of program.getSourceFiles()) {
  if (!sourceFile.isDeclarationFile) {
    findAllResources(sourceFile);
    // findNodesWithCustomDecorator(sourceFile);
  }
}
