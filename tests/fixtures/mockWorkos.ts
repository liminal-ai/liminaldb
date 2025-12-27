import { vi } from "vitest";

type MockWorkosOptions = {
	isValidJwt?: boolean | Error;
	authenticateResult?: {
		user?: { id: string; email: string };
		accessToken?: string;
		refreshToken?: string;
	};
	authenticateError?: Error;
	authorizationUrl?: string;
	getUserResult?: { id: string; email: string };
	getUserError?: Error;
	revokeSessionError?: Error;
};

export function createMockWorkos(opts: MockWorkosOptions = {}) {
	const isValidJwt = opts.isValidJwt ?? true;

	const userManagement = {
		isValidJwt: vi.fn(async (_token: string) => {
			if (isValidJwt instanceof Error) {
				throw isValidJwt;
			}
			return isValidJwt;
		}),
		authenticateWithCode: vi.fn(async () => {
			if (opts.authenticateError) {
				throw opts.authenticateError;
			}
			return (
				opts.authenticateResult ?? {
					user: { id: "user_mock", email: "user@example.com" },
					accessToken: "access_token_mock",
					refreshToken: "refresh_token_mock",
				}
			);
		}),
		getAuthorizationUrl: vi.fn((params?: Record<string, string>) => {
			if (opts.authorizationUrl) {
				return `${opts.authorizationUrl}${
					params?.state ? `&state=${params.state}` : ""
				}`;
			}
			const client = params?.clientId ?? "client_mock";
			const redirect = params?.redirectUri ?? "http://localhost/callback";
			const state = params?.state ? `&state=${params.state}` : "";
			return `https://workos.com/oauth?client_id=${client}&redirect_uri=${redirect}${state}`;
		}),
		getUser: vi.fn(async (id: string) => {
			if (opts.getUserError) {
				throw opts.getUserError;
			}
			return (
				opts.getUserResult ?? {
					id,
					email: "user@example.com",
				}
			);
		}),
		revokeSession: vi.fn(async (_params: { sessionId: string }) => {
			if (opts.revokeSessionError) {
				throw opts.revokeSessionError;
			}
			return { success: true };
		}),
	};

	return { userManagement };
}
