import { WorkOS } from "@workos-inc/node";

const apiKey = process.env.WORKOS_API_KEY;
if (!apiKey) {
	throw new Error("WORKOS_API_KEY environment variable is required");
}

export const workos = new WorkOS(apiKey);

const _clientId = process.env.WORKOS_CLIENT_ID;
if (!_clientId) {
	throw new Error("WORKOS_CLIENT_ID environment variable is required");
}
export const clientId: string = _clientId;

export const redirectUri: string =
	process.env.WORKOS_REDIRECT_URI || "http://localhost:5001/auth/callback";
