import { defineConfig } from "rollup";
import typescript from "@rollup/plugin-typescript";
import resolve from "@rollup/plugin-node-resolve";

export default defineConfig({
	input: "index.ts",
	output: {
		file: "index.js",
		format: "es",
		sourcemap: false,
	},
	plugins: [
		// Bundle the vendored @jilebi/sdk package into the single file that the
		// Jilebi plugin runtime loads.
		resolve({ exportConditions: ["import", "browser"] }),
		typescript({
			tsconfig: "./tsconfig.json",
			sourceMap: false,
			inlineSources: false,
		}),
	],
});
