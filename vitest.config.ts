import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";

export default defineConfig(({ mode }) => ({
	test: {
		env: loadEnv(mode, process.cwd(), ""),
		setupFiles: ["./tests/setup.ts"],
		coverage: {
			provider: "v8",
			reporter: ["text", "html", "lcov"],
			exclude: [
				"node_modules/**",
				"tests/**",
				"convex/_generated/**",
				"**/*.d.ts",
				"vitest.config.ts",
			],
		},
		projects: [
			{
				extends: true,
				test: {
					name: "service",
					include: ["tests/service/**/*.test.ts", "tests/convex/**/*.test.ts"],
					exclude: ["tests/service/ui/**/*.test.ts"],
				},
			},
			{
				extends: true,
				test: {
					name: "ui",
					include: ["tests/service/ui/**/*.test.ts"],
					environment: "jsdom",
					environmentOptions: {
						jsdom: {
							url: "http://localhost:5001",
							runScripts: "dangerously",
						},
					},
				},
			},
			{
				extends: true,
				test: {
					name: "integration",
					include: ["tests/integration/**/*.test.ts"],
					testTimeout: 30000,
				},
			},
		],
	},
}));
