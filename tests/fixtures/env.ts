export function requireEnv(name: string): string {
	const value = process.env[name];
	if (!value) {
		throw new Error(`Missing required env var: ${name}`);
	}
	return value;
}

export function getTestBaseUrl(): string {
	return requireEnv("TEST_BASE_URL");
}
