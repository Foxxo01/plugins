import esbuild from "esbuild";
import { readdir, readFile, writeFile, mkdir, stat } from "fs/promises";
import { existsSync } from "fs";
import path from "path";

await mkdir("dist", { recursive: true });
await writeFile("dist/.nojekyll", "");

const pluginsDir = "plugins";

if (!existsSync(pluginsDir)) {
  console.error(`[CRITICAL HATA] '${pluginsDir}' klasörü bulunamadı!`);
  process.exit(1);
}

const entries = await readdir(pluginsDir);
console.log(`[BİLGİ] Bulunan elemanlar:`, entries);

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

    if (!indexPath) {
      console.error(`[HATA] ${entry} içinde giriş dosyası (index.ts/js/tsx) BULUNAMADI!`);
      continue;
    }

    if (!existsSync(manifestPath)) {
      console.error(`[HATA] ${entry} içinde manifest.json BULUNAMADI!`);
      continue;
    }

    const outDir = path.join("dist", entry);
    await mkdir(outDir, { recursive: true });

    try {
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
        external: ["@vendetta", "@vendetta/*", "react", "react-native"],
      });

      const manifestData = await readFile(manifestPath, "utf8");
      await writeFile(path.join(outDir, "manifest.json"), manifestData);

      console.log(`[BAŞARILI] ${entry} derlendi! -> dist/${entry}`);
    } catch (err) {
      console.error(`[BUILD HATASI] ${entry} derlenemedi:`, err);
    }
  }
}
