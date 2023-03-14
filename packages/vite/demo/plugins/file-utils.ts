import {SourceFile} from "ts-morph";

export function addCodeToFile(file: SourceFile, ...code: string[]) {
  file.addStatements(code)
}
