import path from 'path'
import fs from 'fs'
import {Plugin} from 'vite'
import {Project, SourceFile} from 'ts-morph'
import {
  configureLimitlessApp, constructClientSideApp,
  getLimitlessAPIFromFile,
  LimitlessFile,
  parseProjectAPI
} from "./helpers";


/** @type {import('vite').UserConfig} */
export default function transformTsMorph(): Plugin {
  let config;
  let tempDir;
  let project: Project;
  let sources: SourceFile[];

  return {
    name: 'resource-plugin',
    // handleHotUpdate({file}) {
    //   performWork()
    // },
    async configResolved(configuration) {
      config = configuration;
      tempDir = path.join(config.root, 'src/.limitless');
      performWork()
    },
  };

  function prepareWorkDir() {
    fs.rmSync(tempDir, {recursive: true, force: true});
    fs.mkdirSync(tempDir, {recursive: true});
  }

  function prepareProjectAndAddFiles() {
    project = new Project();
    sources = project.addSourceFilesAtPaths(config.root + '/src/**/*.tsx');

    let filePath = path.join(tempDir, 'index.ts');
    fs.writeFileSync(filePath, 'import * as React from "react";', null);
  }

  function scanSources() {
    let output: {sourceFile: SourceFile, limitlessAPI: LimitlessFile}[] = []
    for (let sourceFile of sources) {
      let fileAPI = getLimitlessAPIFromFile(sourceFile)
      if (fileAPI.resources.length || fileAPI.configurations.length) {
        output.push({
          sourceFile,
          limitlessAPI: getLimitlessAPIFromFile(sourceFile)
        })
      }
    }
    return output;
  }

  function performWork() {
    prepareWorkDir();
    prepareProjectAndAddFiles();

    let targetedFiles = scanSources()
    let limitlessConfig = parseProjectAPI(targetedFiles)
    let routing = configureLimitlessApp(config.root, project, limitlessConfig);

    fs.appendFileSync(
      `${tempDir}/main.tsx`,
      constructClientSideApp(routing)
    )
    // @ts-ignore
    config.build.rollupOptions.input.limitless = tempDir;
  }

}
