import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig, loadEnv } from "vite";
import compression from "vite-plugin-compression";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
	const env = loadEnv(mode, process.cwd(), "");
	return {
		plugins: [
			TanStackRouterVite({ target: "react", autoCodeSplitting: true }),
			react(),
			compression({ algorithm: "gzip", ext: ".gz" }),
			compression({ algorithm: "brotliCompress", ext: ".br" }),
		],
		resolve: {
			alias: {
				"@": path.resolve(__dirname, "src"),
			},
		},
		optimizeDeps: {
			exclude: [".storybook"],
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
					manualChunks: {
						"vendor-react": ["react", "react-dom"],
						"vendor-router": ["@tanstack/react-router"],
						"vendor-charts": ["recharts"],
						"vendor-stripe": ["@stripe/stripe-js", "@stripe/react-stripe-js"],
						"vendor-markdown": ["react-markdown", "remark-gfm"],
						"vendor-motion": ["motion"],
					},
				},
			},
		},
	};
});
