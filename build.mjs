import esbuild from "esbuild";
import { readdir, writeFile, mkdir, stat, copyFile } from "fs/promises";
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
      path.join(pluginPath, "src", "index.tsx"),
    ];

    const indexPath = possiblePaths.find((p) => existsSync(p));
    const manifestPath = path.join(pluginPath, "manifest.json");

    if (!indexPath || !existsSync(manifestPath)) {
      continue;
    }

    const outDir = path.join("dist", entry);
    await mkdir(outDir, { recursive: true });

    try {
      await esbuild.build({
        entryPoints: [indexPath],
        bundle: true,
        minify: false,
        format: "iife",
        globalName: "__plugin__",
        target: "es2020",
        outfile: path.join(outDir, "index.js"),
        // Modülleri hariç tutuyoruz
        external: ["@vendetta", "@vendetta/*", "react", "react-native"],
        // Modülleri çalışma anında global vendetta objesine bağlıyoruz
        banner: {
          js: `
          var require = function(m) {
            if (m.startsWith("@vendetta/")) {
              var key = m.replace("@vendetta/", "");
              return window.vendetta[key];
            }
            if (m === "@vendetta") return window.vendetta;
            if (m === "react") return window.React || (window.vendetta && window.vendetta.metro && window.vendetta.metro.common && window.vendetta.metro.common.React);
            return {};
          };
          `,
        },
        footer: {
          js: "module.exports = __plugin__.default || __plugin__;",
        },
        jsx: "transform",
        jsxFactory: "React.createElement",
        jsxFragment: "React.Fragment",
        resolveExtensions: [".js", ".jsx", ".ts", ".tsx", ".json"],
        loader: {
          ".js": "jsx",
          ".jsx": "jsx",
          ".ts": "ts",
          ".tsx": "tsx",
        },
      });

      const targetManifestPath = path.join(outDir, "manifest.json");
      await copyFile(manifestPath, targetManifestPath);

      console.log(`[BAŞARILI] ${entry} derlendi.`);
    } catch (err) {
      console.error(`[BUILD HATASI] ${entry}:`, err.message);
      process.exit(1);
    }
  }
}
