import esbuild from "esbuild";
import { readdir, readFile, writeFile, mkdir, stat, copyFile } from "fs/promises";
import { existsSync } from "fs";
import path from "path";

await mkdir("dist", { recursive: true });
await writeFile("dist/.nojekyll", "");

const pluginsDir = "plugins";

if (!existsSync(pluginsDir)) {
  console.error(`[HATA] '${pluginsDir}' klasörü bulunamadı!`);
  process.exit(1);
}

const entries = await readdir(pluginsDir);

for (const entry of entries) {
  const pluginPath = path.join(pluginsDir, entry);
  const stats = await stat(pluginPath);

  if (stats.isDirectory()) {
    const possiblePaths = [
      path.join(pluginPath, "index.js"),
      path.join(pluginPath, "src", "index.js"),
      path.join(pluginPath, "index.jsx"),
      path.join(pluginPath, "src", "index.jsx"),
      path.join(pluginPath, "index.ts"),
      path.join(pluginPath, "src", "index.ts"),
    ];

    const indexPath = possiblePaths.find((p) => existsSync(p));
    const manifestPath = path.join(pluginPath, "manifest.json");

    if (!indexPath || !existsSync(manifestPath)) {
      console.warn(`[UYARI] ${entry} için index veya manifest.json bulunamadı, atlanıyor.`);
      continue;
    }

    const outDir = path.join("dist", entry);
    await mkdir(outDir, { recursive: true });

    try {
      // 1. JS Derlemesi
      await esbuild.build({
        entryPoints: [indexPath],
        bundle: true,
        minify: false,
        format: "iife",
        globalName: "__plugin__",
        banner: {
          js: "var module = { exports: {} }; var exports = module.exports;",
        },
        footer: {
          js: "module.exports = __plugin__.default || __plugin__;",
        },
        target: "es2020",
        outfile: path.join(outDir, "index.js"),
        jsx: "transform",
        jsxFactory: "React.createElement",
        jsxFragment: "React.Fragment",
        resolveExtensions: [".js", ".jsx", ".ts", ".tsx", ".json"],
        loader: {
          ".js": "jsx",
          ".jsx": "jsx",
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

      // 2. manifest.json Dosyasını Doğrudan Kopyala
      const targetManifestPath = path.join(outDir, "manifest.json");
      await copyFile(manifestPath, targetManifestPath);

      console.log(`[BAŞARILI] ${entry} ve manifest.json -> dist/${entry} içerisine kopyalandı.`);
    } catch (err) {
      console.error(`[BUILD HATASI] ${entry}:`, err.message);
      process.exit(1);
    }
  }
}
