const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

// Watch all files in the monorepo so Metro can resolve shared packages
// Merge with Expo's defaults instead of replacing them entirely
config.watchFolders = [...(config.watchFolders ?? []), workspaceRoot];

// Tell Metro to resolve packages from both the app's own node_modules
// and the hoisted root node_modules (Yarn workspaces hoisting)
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];

module.exports = config;
