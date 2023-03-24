import fs from 'fs'
import path from 'path'
import {Plugin} from 'vite'
import esbuild from 'esbuild'
import {Project, SourceFile} from 'ts-morph'
import {
  constructBundle,
  containsFrameworkAPIUsage,
  FlatRouting,
  performFrameworkAPIExtractionOnFile
} from "./helpers";

/** @type {import('vite').UserConfig} */
export default function transformTsMorph(): Plugin {
  let config;
  let tempDir;
  let buildMode;
  let project: Project;
  let routing: Record<string, FlatRouting> = {}
  let trackedFiles: Map<string, { src: SourceFile, routing?: Record<string, FlatRouting> }>

  return {
    name: 'resource-plugin',
    async configResolved(configuration) {
      project = new Project()
      config = configuration
      buildMode = resolveBuildMode(configuration)
      tempDir = path.join(config.root, 'src/.limitless')
      project.addSourceFilesAtPaths(config.root + '/src/**/*.tsx')

      prepareWorkDir(tempDir)
      trackedFiles = scanTrackedFilesMap(project)

      for (let trackedFile of trackedFiles.values()) {
        let prevTrackedFileRouting = trackedFile.routing
        trackedFile.routing = performFrameworkAPIExtractionOnFile(trackedFile.src)
        reconcileRouting(routing, trackedFile.routing, prevTrackedFileRouting)
      }
      constructBundle(config, project, routing, tempDir, buildMode)
    },
    async handleHotUpdate({file}) {
      if (hasFrameworkAPI(file)) {
        let sourceFile = project.getSourceFile(file)
        sourceFile.refreshFromFileSystemSync()
        let fileRouting = performFrameworkAPIExtractionOnFile(sourceFile)
        let previousRegisteredRoutingOnFile = trackedFiles.get(file).routing
        reconcileRouting(routing, fileRouting, previousRegisteredRoutingOnFile)
        constructBundle(config, project, routing, tempDir, buildMode)
      }
    },
    async generateBundle() {
      if (buildMode === "ssr") {
        let entryPoints = [tempDir + "/client.tsx"]
        esbuild
          .build({
            entryPoints,
            bundle: true,
            format: "esm",
            outdir: 'dist/client',
            splitting: true,
            target: 'es2017',
            jsx: "transform",
            platform: 'browser',
            loader: {
              '.js': 'jsx',
              '.ts': 'tsx',
              '.tsx': 'tsx',
            },
          })
          .catch(() => process.exit(1));
      }

    },
  };

  function hasFrameworkAPI(file) {
    let sourceFile = project.getSourceFile(file)
    if (!sourceFile) {
      sourceFile = project.addSourceFileAtPath(file)
    }
    return doesFileContainAnyFrameworkAPIUsage(sourceFile)
  }
}

function scanTrackedFilesMap(project: Project) {
  let map: Map<string, { src: SourceFile, routing?: Record<string, FlatRouting> }> = new Map()
  for (let src of project.getSourceFiles()) {
    if (doesFileContainAnyFrameworkAPIUsage(src)) {
      map.set(src.getFilePath(), {src})
    }
  }
  return map
}


function resolveBuildMode(config): "csr" | "ssr" | "rsc" {
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

function doesFileContainAnyFrameworkAPIUsage(sourceFile) {
  return sourceFile.getClasses().some(containsFrameworkAPIUsage)
}

function prepareWorkDir(tempDir) {
  fs.rmSync(tempDir, {recursive: true, force: true});
  fs.mkdirSync(tempDir, {recursive: true});
  fs.mkdirSync(tempDir + "/client", {recursive: true});
  fs.mkdirSync(tempDir + "/server", {recursive: true});
  fs.mkdirSync(tempDir + "/shared", {recursive: true});
}

function reconcileRouting(
  routing: Record<string, FlatRouting>,
  fileRouting: Record<string, FlatRouting>,
  previouslyTrackedFileRouting: Record<string, FlatRouting> | undefined,
  onRouteAlreadyExists?: (route: string) => void
) {
  if (previouslyTrackedFileRouting) {
    for (let [httpMethod, routes] of Object.entries(previouslyTrackedFileRouting)) {
      if (!routing[httpMethod]) {
        continue
      }
      for (let [prevConfigPath] of Object.entries(routes)) {
        if (routing[httpMethod][prevConfigPath]) {
          delete routing[httpMethod][prevConfigPath]
        }
      }
    }
  }

  for (let [httpMethod, routes] of Object.entries(fileRouting)) {
    if (!routing[httpMethod]) {
      routing[httpMethod] = routes
      continue
    }
    let previousRoutes = routing[httpMethod]
    for (let [newRoutePath, routeConfig] of Object.entries(routes)) {
      if (previousRoutes[newRoutePath]) {
        onRouteAlreadyExists?.(newRoutePath)
      }
      previousRoutes[newRoutePath] = routeConfig
    }
  }
}
