import esbuild from "esbuild";
import { readdir, readFile, writeFile, mkdir, stat } from "fs/promises";
import path from "path";

const pluginsDir = "plugins";
await mkdir("dist", { recursive: true });

const entries = await readdir(pluginsDir);

for (const entry of entries) {
  const pluginPath = path.join(pluginsDir, entry);
  const stats = await stat(pluginPath);

  if (stats.isDirectory()) {
    const indexPath = path.join(pluginPath, "index.jsx");
    const manifestPath = path.join(pluginPath, "manifest.json");

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
    
    console.log(`[BUILD] ${entry} tamamlandı.`);
  }
}
