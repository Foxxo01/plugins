import esbuild from "esbuild";
import { readdir, readFile, writeFile, mkdir, stat } from "fs/promises";
import { existsSync } from "fs";
import path from "path";

// 1. Clean dist directory & add .nojekyll
await mkdir("dist", { recursive: true });
await writeFile("dist/.nojekyll", "");

const pluginsDir = "plugins";

if (!existsSync(pluginsDir)) {
  console.error(`[HATA] '${pluginsDir}' directory not found!`);
  process.exit(1);
}

const entries = await readdir(pluginsDir);
const manifestList = [];

for (const entry of entries) {
  const pluginPath = path.join(pluginsDir, entry);
  const stats = await stat(pluginPath);

  if (stats.isDirectory()) {
    const possiblePaths = [
      path.join(pluginPath, "index.jsx"),
      path.join(pluginPath, "index.js"),
      path.join(pluginPath, "index.tsx"),
      path.join(pluginPath, "index.ts"),
      path.join(pluginPath, "src", "index.jsx"),
      path.join(pluginPath, "src", "index.js"),
      path.join(pluginPath, "src", "index.tsx"),
      path.join(pluginPath, "src", "index.ts"),
    ];

    const indexPath = possiblePaths.find((p) => existsSync(p));
    const manifestPath = path.join(pluginPath, "manifest.json");

    if (!indexPath || !existsSync(manifestPath)) {
      console.warn(`[SKIP] ${entry} -> index file or manifest.json is missing.`);
      continue;
    }

    const outDir = path.join("dist", entry);
    await mkdir(outDir, { recursive: true });

    try {
      // Build index.js formatted for Vendetta/Revenge
      await esbuild.build({
        entryPoints: [indexPath],
        bundle: true,
        minify: true,
        format: "iife",
        globalName: "plugin",
        footer: {
          js: "module.exports = plugin.default || plugin;",
        },
        target: "es2021",
        outfile: path.join(outDir, "index.js"),
        jsx: "transform",
        jsxFactory: "React.createElement",
        jsxFragment: "React.Fragment",
        external: ["@vendetta", "@vendetta/*", "react", "react-native"],
      });

      // Parse & Copy Manifest
      const manifestData = JSON.parse(await readFile(manifestPath, "utf8"));
      await writeFile(
        path.join(outDir, "manifest.json"),
        JSON.stringify(manifestData, null, 2)
      );

      manifestList.push(manifestData);
      console.log(`[SUCCESS] ${entry} compiled successfully to dist/${entry}`);
    } catch (err) {
      console.error(`[ERROR] ${entry} compilation failed:`, err.message);
    }
  }
}

// Write master manifest list to dist root
await writeFile("dist/plugins.json", JSON.stringify(manifestList, null, 2));
console.log(`[FINISH] All plugins processed. ${manifestList.length} plugins in build.`);
