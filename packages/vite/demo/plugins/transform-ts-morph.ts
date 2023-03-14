import path from 'path'
import fs from 'fs'
import {Plugin} from 'vite'
import {Project, SourceFile} from 'ts-morph'
import {
  LimitlessResource,
  getResourceClasses,
  scanAndProcessCapabilities
} from "./helpers";


/** @type {import('vite').UserConfig} */
export default function transformTsMorph(): Plugin {
  let project: Project;
  let appConfig: LimitlessResource[] = []

  let tempDir;

  return {
    name: 'resource-plugin',
    async configResolved(config) {
      tempDir = path.join(config.root, 'src/.limitless');
      fs.mkdirSync(tempDir, {recursive: true});

      let filePath = path.join(tempDir, 'index.ts');
      fs.writeFileSync(filePath, 'import * as React from "react";', null);

      project = new Project();
      let sources = project.addSourceFilesAtPaths(config.root + '/src/**/*.tsx');

      for (let sourceFile of sources) {
        let classesConfig = getResourceClasses(sourceFile)
        if (classesConfig.length > 0) {
          for (let classConfig of classesConfig) {
            classConfig.capabilities = scanAndProcessCapabilities(
              config.root,
              project,
              classConfig,
              tempDir,
            )
            // Object.keys(classConfig.capabilities)
            //   .forEach(id => {
            //     let cap = classConfig.capabilities[id]
            //
            //   })
            appConfig.push(classConfig)
          }
        }
      }



      // console.log('GOT THEM', appConfig)
      // @ts-ignore
      config.build.rollupOptions.input.limitless = tempDir;
    },
    // async transform(code, id) {
    //   if (!id.endsWith('.tsx') && !id.endsWith('.ts')) {
    //     return null;
    //   }
    //   console.log('___________got ', id)
    //   if (!id.endsWith('.tsx')) {
    //     return null;
    //   }
    //
    // },
  };

}

