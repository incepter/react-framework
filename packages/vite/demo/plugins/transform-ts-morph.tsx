import esbuild from 'esbuild'
import path from 'path'
import fs from 'fs'
import {Plugin} from 'vite'
import {Project, SourceFile} from 'ts-morph'
import {
  configureLimitlessApp,
  getLimitlessAPIFromFile,
  LimitlessFile,
  parseProjectAPI
} from "./helpers";
import {constructServerClientApp, constructServerSideApp} from "./server";


/** @type {import('vite').UserConfig} */
export default function transformTsMorph(): Plugin {
  let config;
  let tempDir;
  let buildMode;
  let project: Project;
  let sources: SourceFile[];

  return {
    name: 'resource-plugin',
    // handleHotUpdate({file}) {
    //   performWork()
    // },
    generateBundle() {
      if (buildMode === "ssr") {
        console.log('__________________')
        esbuild
          .build({
            jsx: "transform",
            entryPoints: [tempDir + "/client.tsx"],
            bundle: true,
            platform: 'browser',
            target: 'es2017',
            splitting: true,
            format: "esm",
            outdir: 'dist/client',
            // outfile: 'build/client.js',
            loader: {
              '.js': 'jsx',
              '.ts': 'tsx',
              '.tsx': 'tsx',
            },
          })
          .then(() => console.log('_____________esbuild end___________'))
          .catch(() => process.exit(1));
      }
    },
    async configResolved(configuration) {
      config = configuration;
      tempDir = path.join(config.root, 'src/.limitless');
      await performWork()
    },
  };

  async function performWork() {
    prepareWorkDir();
    prepareProjectAndAddFiles();

    buildMode = resolveBuildMode();

    let targetedFiles = scanSources();
    let limitlessConfig = parseProjectAPI(targetedFiles)
    let routing = configureLimitlessApp(config.root, project, limitlessConfig);


    if (buildMode === "csr") {
      fs.appendFileSync(`${tempDir}/main.tsx`, constructServerSideApp(routing))
      config.build.rollupOptions.input.limitless = tempDir;
    }

    if (buildMode === "ssr") {
      let src = config.root + "/plugins/static/server.js";
      fs.copyFileSync(src, tempDir + "/server.js");
      fs.appendFileSync(`${tempDir}/main.tsx`, constructServerSideApp(routing))
      fs.appendFileSync(`${tempDir}/client.tsx`, constructServerClientApp(routing))
      config.build.rollupOptions.input.server = tempDir + "/server.js";
      // config.build.rollupOptions.input.client = tempDir + "/client.tsx";
    }
    // @ts-ignore
    // config.build.rollupOptions.input.limitless = tempDir;
  }

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
        console.log(`[[Resource] - Found resource in file ${sourceFile.getFilePath()}]`)
        output.push({
          sourceFile,
          limitlessAPI: getLimitlessAPIFromFile(sourceFile)
        })
      }
    }
    return output;
  }

  function resolveBuildMode(): "csr" | "ssr" | "rsc" {
    let filePath = config.root + "/.limitless.json";
    try {
      if (fs.existsSync(filePath)) {
        return JSON.parse(fs.readFileSync(filePath, "utf-8")).target;
      }
      return "csr"
    } catch (e) {
      return "csr"
    }
  }

}
