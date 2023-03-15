import path from 'path'
import fs from 'fs'
import {Plugin} from 'vite'
import {Project} from 'ts-morph'
import {
  constructClientSideApp,
  getLimitlessAPIFromFile,
  LimitlessResource,
  parseProjectResources,
  scanAndProcessCapabilities
} from "./helpers";


/** @type {import('vite').UserConfig} */
export default function transformTsMorph(): Plugin {
  let config;
  let tempDir;

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

  function performWork() {
    fs.rmSync(tempDir, {recursive: true, force: true});
    fs.mkdirSync(tempDir, {recursive: true});

    let filePath = path.join(tempDir, 'index.ts');
    fs.writeFileSync(filePath, 'import * as React from "react";', null);

    let project = new Project();
    let sources = project.addSourceFilesAtPaths(config.root + '/src/**/*.tsx');

    let resources: LimitlessResource[] = []
    for (let sourceFile of sources) {
      let fileAPI = getLimitlessAPIFromFile(sourceFile);

      // if (fileAPI.configurations.length) {
      //   parseProjectConfiguration(fileAPI.configurations)
      // }
      if (fileAPI.resources.length) {
        let thisFileResources = parseProjectResources(fileAPI.resources)
        for (let fileResource of thisFileResources) {
          fileResource.apis = scanAndProcessCapabilities(config.root, project, fileResource, tempDir)
        }
        resources = resources.concat(thisFileResources)
      }

      //
      // let classesConfig = getResourceClasses(sourceFile)
      // if (classesConfig.length > 0) {
      //
      //   for (let classConfig of classesConfig) {
      //     classConfig.apis = scanAndProcessCapabilities(config.root, project, classConfig, tempDir)
      //     appConfig.push(classConfig)
      //   }
      // }
    }

    fs.appendFileSync(
      `${tempDir}/main.tsx`,
      constructClientSideApp(resources)
    )
    // @ts-ignore
    config.build.rollupOptions.input.limitless = tempDir;
  }

}
