import esbuild from "esbuild";
import { readdir, readFile, writeFile, mkdir, stat } from "fs/promises";
import { existsSync } from "fs";
import path from "path";

await mkdir("dist/plugins", { recursive: true });
await writeFile("dist/.nojekyll", "");

const pluginsDir = "plugins";

if (!existsSync(pluginsDir)) {
  console.error(`[CRITICAL HATA] '${pluginsDir}' klasörü bulunamadı!`);
  process.exit(1);
}

const entries = await readdir(pluginsDir);

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
      continue;
    }

    const outDir = path.join("dist", "plugins", entry);
    await mkdir(outDir, { recursive: true });

    try {
      await esbuild.build({
        entryPoints: [indexPath],
        bundle: true,
        minify: true,
        format: "iife",
        globalName: "plugin",
        footer: {
          js: "if (typeof plugin !== 'undefined') { module.exports = plugin.default || plugin; }",
        },
        target: "es2020",
        outfile: path.join(outDir, "index.js"),
        jsx: "transform",
        jsxFactory: "React.createElement",
        jsxFragment: "React.Fragment",
        resolveExtensions: [".tsx", ".ts", ".jsx", ".js", ".json"],
        loader: {
          ".js": "jsx",
          ".ts": "tsx",
          ".jsx": "jsx",
          ".tsx": "tsx",
        },
        external: [
          "@vendetta",
          "@vendetta/*",
          "react",
          "react-native",
          "@metro",
          "@metro/*",
          "@ui",
          "@ui/*"
        ],
      });

      const manifestRaw = await readFile(manifestPath, "utf8");
      const manifestData = JSON.parse(manifestRaw);
      manifestData.main = "index.js";

      await writeFile(
        path.join(outDir, "manifest.json"),
        JSON.stringify(manifestData)
      );

      console.log(`[BAŞARILI] ${entry} derlendi.`);
    } catch (err) {
      console.error(`[BUILD HATASI] ${entry} derlenemedi:`, err.message);
      process.exit(1);
    }
  }
}
