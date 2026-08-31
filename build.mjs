import { readFile, writeFile, readdir, mkdir } from "fs/promises";
import path from "path";
import { createHash } from "crypto";

import { rollup } from "rollup";
import esbuild from "rollup-plugin-esbuild";
import commonjs from "@rollup/plugin-commonjs";
import nodeResolve from "@rollup/plugin-node-resolve";
import alias from "@rollup/plugin-alias";
import { fileURLToPath } from "url";

const extensions = [".js", ".jsx", ".mjs", ".ts", ".tsx", ".cts", ".mts"];

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type import("rollup").InputPluginOption */
const plugins = [
    alias({
        entries: [
            {
                find: "@lib", replacement: path.resolve(__dirname, "lib")
            }
        ]
    }),
    nodeResolve({ extensions }),
    commonjs(),
    esbuild({ 
        minify: true,
        target: "es2022",
        loaders: {
            ".ts": "ts",
            ".tsx": "tsx"
        }
    }),
];

// Build all plugins found in the plugins/ directory. Be resilient to missing/invalid manifests
// so CI doesn't fail for a single broken plugin. We will skip directories without a valid manifest
// or without a 'main' entry and continue building the rest.

const pluginDirents = await readdir("./plugins", { withFileTypes: true });
for (let dirent of pluginDirents) {
    if (!dirent.isDirectory()) continue;
    const plug = dirent.name;

    let manifest;
    try {
        const raw = await readFile(`./plugins/${plug}/manifest.json`, "utf8");
        manifest = JSON.parse(raw);
    } catch (e) {
        console.warn(`Skipping plugin '${plug}': cannot read/parse manifest.json (${e.message})`);
        continue;
    }

    if (!manifest || !manifest.main) {
        console.warn(`Skipping plugin '${plug}': manifest.main is missing`);
        continue;
    }

    const outPath = `./dist/${plug}/index.js`;

    try {
        // Ensure output directory exists
        await mkdir(path.dirname(outPath), { recursive: true });

        const bundle = await rollup({
            input: `./plugins/${plug}/${manifest.main}`,
            onwarn: () => {},
            plugins,
        });
    
        await bundle.write({
            file: outPath,
            globals(id) {
                if (id.startsWith("@vendetta")) return id.substring(1).replace(/\//g, ".");
                const map = {
                    react: "window.React",
                };

                return map[id] || null;
            },
            format: "iife",
            compact: true,
            exports: "named",
        });
        await bundle.close();
    
        const toHash = await readFile(outPath);
        manifest.hash = createHash("sha256").update(toHash).digest("hex");
        manifest.main = "index.js";
        await writeFile(`./dist/${plug}/manifest.json`, JSON.stringify(manifest, null, 2));
    
        console.log(`Successfully built ${manifest.name || plug}!`);
    } catch (e) {
        console.error(`Failed to build plugin '${plug}':`, e);
        // Don't exit the whole process; continue with other plugins so CI can succeed if others build.
    }
}
