import path from 'path'
import fs from 'fs'
import {Plugin} from 'vite'
import {Project, SourceFile} from 'ts-morph'
import {
  LimitlessResource,
  getResourceClasses,
  scanAndProcessCapabilities, DecoratorConfigured
} from "./helpers";


/** @type {import('vite').UserConfig} */
export default function transformTsMorph(): Plugin {
  let tempDir;
  let project: Project;
  let appConfig: LimitlessResource[] = []

  return {
    name: 'resource-plugin',
    async configResolved(config) {
      tempDir = path.join(config.root, 'src/.limitless');
      fs.rmSync(tempDir, {recursive: true, force: true});
      fs.mkdirSync(tempDir, {recursive: true});

      let filePath = path.join(tempDir, 'index.ts');
      fs.writeFileSync(filePath, 'import * as React from "react";', null);

      project = new Project();
      let sources = project.addSourceFilesAtPaths(config.root + '/src/**/*.tsx');

      for (let sourceFile of sources) {
        let classesConfig = getResourceClasses(sourceFile)
        if (classesConfig.length > 0) {
          for (let classConfig of classesConfig) {
            classConfig.apis = scanAndProcessCapabilities(
              config.root,
              project,
              classConfig,
              tempDir,
            )
            appConfig.push(classConfig)
          }
        }
      }
      // @ts-ignore
      config.build.rollupOptions.input.limitless = tempDir;
    },
  };

}

