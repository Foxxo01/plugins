import esbuild from "esbuild";
import { readdir, readFile, writeFile, mkdir, stat } from "fs/promises";
import { existsSync } from "fs";
import path from "path";

// 1. Önce 'dist' klasörünü oluştur
await mkdir("dist", { recursive: true });

// 2. Klasör oluştuktan SONRA .nojekyll dosyasını yaz
await writeFile("dist/.nojekyll", "");

const pluginsDir = "plugins";
const entries = await readdir(pluginsDir);

for (const entry of entries) {
  const pluginPath = path.join(pluginsDir, entry);
  const stats = await stat(pluginPath);

  if (stats.isDirectory()) {
    const possibleEntries = ["index.jsx", "index.js", "index.tsx", "index.ts"];
    const entryFile = possibleEntries.find(file => existsSync(path.join(pluginPath, file)));

    if (!entryFile) {
      console.warn(`[SKIP] ${entry} içinde giriş dosyası bulunamadı, atlanıyor.`);
      continue;
    }

    const indexPath = path.join(pluginPath, entryFile);
    const manifestPath = path.join(pluginPath, "manifest.json");

    if (!existsSync(manifestPath)) {
      console.warn(`[SKIP] ${entry} içinde manifest.json bulunamadı, atlanıyor.`);
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

    console.log(`[BUILD] ${entry} derlendi.`);
  }
}
