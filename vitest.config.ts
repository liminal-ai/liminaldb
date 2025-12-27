import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";

export default defineConfig(({ mode }) => ({
	test: {
		env: loadEnv(mode, process.cwd(), ""),
		projects: [
			{
				extends: true,
				test: {
					name: "service",
					include: ["tests/service/**/*.test.ts", "tests/convex/**/*.test.ts"],
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
