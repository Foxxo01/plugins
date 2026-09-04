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
console.log(`[BİLGİ] Bulunan klasörler/dosyalar:`, entries);

for (const entry of entries) {
  const pluginPath = path.join(pluginsDir, entry);
  const stats = await stat(pluginPath);

  if (stats.isDirectory()) {
    const possibleEntries = ["index.jsx", "index.js", "index.tsx", "index.ts"];
    const entryFile = possibleEntries.find(file => existsSync(path.join(pluginPath, file)));

    if (!entryFile) {
      console.warn(`[SKIP] ${entry} atlandı -> Giriş dosyası (index.jsx/js/tsx/ts) yok.`);
      continue;
    }

    const indexPath = path.join(pluginPath, entryFile);
    const manifestPath = path.join(pluginPath, "manifest.json");

    if (!existsSync(manifestPath)) {
      console.warn(`[SKIP] ${entry} atlandı -> manifest.json dosyası yok.`);
      continue;
    }

    const outDir = path.join("dist", entry);
    await mkdir(outDir, { recursive: true });

    await esbuild.build({
      entryPoints: [indexPath],
      bundle: true,
      minify: true,
      format: "esm",
      target: "es2021",
      outfile: path.join(outDir, "index.js"),
      external: ["@vendetta", "@vendetta/*"]
    });

    const manifest = await readFile(manifestPath, "utf8");
    await writeFile(path.join(outDir, "manifest.json"), manifest);

    console.log(`[BAŞARILI] ${entry} derlendi ve dist/${entry} klasörüne eklendi.`);
  }
}
