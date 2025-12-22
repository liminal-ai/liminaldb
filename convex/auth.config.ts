const clientId = "client_01K45EFEBZEWADFS8TA6TS9X6B";

export default {
	providers: [
		{
			type: "customJwt",
			issuer: "https://api.workos.com/",
			algorithm: "RS256",
			applicationID: clientId,
			jwks: `https://api.workos.com/sso/jwks/${clientId}`,
		},
		{
			type: "customJwt",
			issuer: `https://api.workos.com/user_management/${clientId}`,
			algorithm: "RS256",
			jwks: `https://api.workos.com/sso/jwks/${clientId}`,
		},
	],
};
