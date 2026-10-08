import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig, loadEnv } from "vite";
import compression from "vite-plugin-compression";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
	const env = loadEnv(mode, process.cwd(), "");
	return {
		plugins: [
			tanstackRouter({ target: "react", autoCodeSplitting: true }),
			react(),
			compression({ algorithm: "gzip", ext: ".gz" }),
			compression({ algorithm: "brotliCompress", ext: ".br" }),
		],
		resolve: {
			// Proto ships as source from its own repo; this alias must precede
			// "@" so existing @/proto-design-system imports resolve into it.
			alias: [
				{
					find: /^@\/proto-design-system/,
					replacement: path.resolve(
						__dirname,
						"node_modules/@optimusfoundry/proto-design-system/src",
					),
				},
				{ find: "@", replacement: path.resolve(__dirname, "src") },
			],
		},
		optimizeDeps: {
			// Proto is app source in node_modules; pre-bundling part of it
			// splits module state (two ThemeContexts) in dev.
			exclude: [
				".storybook",
				"@optimusfoundry/proto-design-system",
				"@/proto-design-system",
			],
		},
		define: {
			__APP_ENV__: JSON.stringify(env.APP_ENV),
		},
		server: {
			port: 3000,
		},
		build: {
			target: "esnext",
			rollupOptions: {
				output: {
					manualChunks: (id) => {
						if (id.includes("node_modules")) {
							if (id.includes("/react/") || id.includes("/react-dom/"))
								return "vendor-react";
							if (id.includes("@tanstack/react-router")) return "vendor-router";
							if (id.includes("/recharts/")) return "vendor-charts";
							if (id.includes("@stripe/")) return "vendor-stripe";
							if (
								id.includes("/react-markdown/") ||
								id.includes("/remark-gfm/")
							)
								return "vendor-markdown";
							if (
								id.includes("/motion/") ||
								id.includes("/motion-dom/") ||
								id.includes("/motion-utils/")
							)
								return "vendor-motion";
						}
					},
				},
			},
		},
	};
});
