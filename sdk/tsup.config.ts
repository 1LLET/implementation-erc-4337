import { defineConfig } from "tsup";

export default defineConfig({
    entry: ["src/index.ts"],
    format: ["cjs", "esm"], // Build for commonjs and esmodules
    dts: true, // Generate declaration file (.d.ts)
    splitting: false,
    sourcemap: true,
    clean: true,
    treeshake: true,
    external: ["@defuse-protocol/one-click-sdk-typescript", "viem", "axios", "stellar-sdk"],
});
