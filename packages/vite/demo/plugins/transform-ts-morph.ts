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
      console.log('___________xxxxxxxxxxxx_______________')
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

      let routes = {}
      for (let config of appConfig) {
        if (!routes[config.path]) {
          routes[config.path] = {
            path: config.path,
          }
        }
      }

      fs.appendFileSync(
        `${tempDir}/main.tsx`,
        constructClientSideApp(appConfig)
      )
      // @ts-ignore
      config.build.rollupOptions.input.limitless = tempDir;
    },
  };

}

function constructClientSideApp(appConfig: LimitlessResource[]) {
  let importsString = ``
  let routing = `let router = createBrowserRouter([`

  appConfig.forEach(current =>  {
    Object.values(current.apis).forEach(api => {
      if (api.path && api.moduleName && api.modulePath) {
        importsString += `import { ${api.moduleName} } from "${api.modulePath}";\n`;
        routing += `{ path: "${api.fullPath}", element: <${api.moduleName} /> },`
      }
    })
  })
  routing += '])'


  return `import * as React from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom"
${importsString}
${routing}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
)
  `
}
