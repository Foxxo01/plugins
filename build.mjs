import esbuild from "esbuild";
import { readdir, readFile, writeFile, mkdir, stat } from "fs/promises";
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
      path.join(pluginPath, "index.jsx"),
      path.join(pluginPath, "index.js"),
      path.join(pluginPath, "index.tsx"),
      path.join(pluginPath, "index.ts"),
      path.join(pluginPath, "src", "index.jsx"),
      path.join(pluginPath, "src", "index.js"),
      path.join(pluginPath, "src", "index.tsx"),
      path.join(pluginPath, "src", "index.ts"),
    ];

    const indexPath = possiblePaths.find(p => existsSync(p));

    if (!indexPath) {
      console.warn(`[SKIP] ${entry} atlandı -> index dosyası bulunamadı.`);
      continue;
    }

    const manifestPath = path.join(pluginPath, "manifest.json");

    if (!existsSync(manifestPath)) {
      console.warn(`[SKIP] ${entry} atlandı -> manifest.json dosyası yok.`);
      continue;
    }

    const outDir = path.join("dist", entry);
    await mkdir(outDir, { recursive: true });

    // Dosya uzantısına göre loader seç
    const ext = path.extname(indexPath).slice(1);
    const loaderType = ext === "ts" || ext === "tsx" || ext === "jsx" ? ext : "js";

    await esbuild.build({
      entryPoints: [indexPath],
      bundle: true,
      minify: true,
      format: "esm",
      target: "es2021",
      loader: { [`.${ext}`]: loaderType },
      outfile: path.join(outDir, "index.js"),
      external: ["@vendetta", "@vendetta/*"]
    });

    const manifest = await readFile(manifestPath, "utf8");
    await writeFile(path.join(outDir, "manifest.json"), manifest);

    console.log(`[BAŞARILI] ${entry} derlendi ve dist/${entry} klasörüne eklendi.`);
  }
}
