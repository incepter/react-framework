import fs from 'fs'
import path from 'path'
import {Plugin} from 'vite'
import esbuild from 'esbuild'
import {pathToFileURL} from 'url'
// import {Project} from 'ts-morph'

// type RouteConfig = {}
const STATIC_HTML = `
<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01//EN"
        "http://www.w3.org/TR/html4/strict.dtd">
<html lang="en">
<head>
    <meta http-equiv="Content-Type" content="text/html;charset=UTF-8">
 <title>Document</title>
</head>
<body>
<div id="root"></div>
<script src="/runtime.js"></script>
</body>
</html>
`
type RoutingConfig = {
  modulePath: string,
  children?: Record<string, RoutingConfig>,
}

type BuildRouting = Record<string, RoutingConfig>

//   {
//   config: RoutingConfig,
//   children?: RoutingConfig[]
// }

/** @type {import('vite').UserConfig} */
export default function routerPlugin(): Plugin {
  let config;
  let appDir;
  let buildDir;
  // let project: Project;
  let routing: BuildRouting = {}

  return {
    name: 'resource-plugin',
    async configResolved(configuration) {
      config = configuration
      // project = new Project()
      appDir = path.join(config.root, 'src/app');
      buildDir = path.join(config.root, 'buildd');
      await fs.promises.rm(buildDir, {recursive: true, force: true});
      routing = await buildRoutingTree(appDir, buildDir, routing, true);

      try {
        routing = await buildRoutingTree(appDir, routing);
        console.log(JSON.stringify(routing, null, 2));
      } catch (err: any) {
        console.error('Error:', err.message);
      }
    },
  };

  async function readDirectory(dir) {
    return await fs.promises.readdir(dir, {withFileTypes: true});
  }

  async function buildRoutingTree(
    appDir,
    initialBuildDir,
    tree: BuildRouting = {},
    root = false,
  ): Promise<BuildRouting> {
    let buildDir = initialBuildDir;
    // await fs.promises.mkdir(buildDir);

    if (root) {
      await fs.promises.mkdir(path.join(buildDir, "app"), {recursive: true});
      buildDir = path.join(initialBuildDir, "app");
      const indexHtmlFilePath = path.join(buildDir, "index.html");
      await fs.promises.writeFile(indexHtmlFilePath, STATIC_HTML);
    }

    const items = await readDirectory(appDir);
    for (const item of items) {
      const itemPath = path.join(appDir, item.name);
      if (item.isDirectory()) {

        const currentBuildDir = path.join(buildDir, item.name);
        await fs.promises.mkdir(currentBuildDir);
        const indexHtmlFilePath = path.join(currentBuildDir, "index.html");
        await fs.promises.writeFile(indexHtmlFilePath, STATIC_HTML);

        const fileURL = pathToFileURL(itemPath);
        tree[item.name] = {
          modulePath: fileURL.toString() + "/index.tsx",
          children: {},
        };

        await buildRoutingTree(itemPath, currentBuildDir, tree[item.name].children);
      } else if (item.isFile() && item.name === 'index.tsx') {
        const entryIndexTsxFilePath = path.join(itemPath);
        esbuild
          .build({
            external: ["react", "react-dom", "react/jsx-runtime"],
            bundle: true,
            format: "esm",
            target: 'chrome58',
            jsx: "automatic",
            platform: 'browser',
            outdir: buildDir.toString(),
            entryPoints: [entryIndexTsxFilePath],
            loader: {
              '.js': 'jsx',
              '.ts': 'tsx',
              '.tsx': 'tsx',
            },
          })
          .catch((e) => {
            console.log('esbuild failed because of', e);
            process.exit(1);
          });

        if (root) {
          esbuild
            .build({
              bundle: true,
              format: "esm",
              splitting: true,
              target: 'es2017',
              jsx: "transform",
              platform: 'browser',
              entryPoints: [path.resolve("src", "runtime.tsx")],
              outdir: buildDir.toString(),
              loader: {
                '.js': 'jsx',
                '.ts': 'tsx',
                '.tsx': 'tsx',
              },
            })
            .catch((e) => {
              console.log('esbuild failed because of', e);
              process.exit(1);
            });
        }
      }
    }
    return tree;
  }


}
