# WorkOS Auth Setup Instructions

**Project:** PromptDB
**Working Directory:** `/Users/leemoore/promptdb`

**Prerequisite:** WorkOS dashboard already configured with:
- Redirect URI: `http://localhost:5001/auth/callback`
- CORS Origin: `http://localhost:5001`

---

## Step 1: Install Packages

```bash
bun add @workos-inc/node @fastify/cookie
```

---

## Step 2: Update .env.local

Add these lines to the existing `.env.local` file (keep the CONVEX_* lines that are already there):

```
# WorkOS Auth
WORKOS_CLIENT_ID=<user will provide>
WORKOS_API_KEY=<user will provide>
WORKOS_REDIRECT_URI=http://localhost:5001/auth/callback

# Cookie signing
COOKIE_SECRET=<user will provide>
```

**Tell the user to fill in the actual values.**

---

## Step 3: Create WorkOS Client

Create file `src/lib/workos.ts`:

```typescript
import { WorkOS } from "@workos-inc/node";

const apiKey = process.env.WORKOS_API_KEY;
if (!apiKey) {
	throw new Error("WORKOS_API_KEY environment variable is required");
}

export const workos = new WorkOS(apiKey);

const clientId = process.env.WORKOS_CLIENT_ID;
if (!clientId) {
	throw new Error("WORKOS_CLIENT_ID environment variable is required");
}

export { clientId };

export const redirectUri =
	process.env.WORKOS_REDIRECT_URI || "http://localhost:5001/auth/callback";
```

---

## Step 4: Create Auth Middleware

Create file `src/middleware/auth.ts`:

```typescript
import type {
	FastifyReply,
	FastifyRequest,
	HookHandlerDoneFunction,
} from "fastify";
import { workos } from "../lib/workos";

// Extend FastifyRequest to include user
declare module "fastify" {
	interface FastifyRequest {
		user?: {
			id: string;
			email: string;
			firstName?: string;
			lastName?: string;
		};
		accessToken?: string;
	}
}

export async function authMiddleware(
	request: FastifyRequest,
	reply: FastifyReply,
	done: HookHandlerDoneFunction,
): Promise<void> {
	try {
		const accessToken = request.cookies.accessToken;

		if (!accessToken) {
			reply.code(401).send({ error: "Not authenticated" });
			return;
		}

		// Verify the JWT with WorkOS
		const { user } = await workos.userManagement.getUser(accessToken);

		request.user = {
			id: user.id,
			email: user.email,
			firstName: user.firstName || undefined,
			lastName: user.lastName || undefined,
		};
		request.accessToken = accessToken;
	} catch (error) {
		reply.code(401).send({ error: "Invalid or expired token" });
		return;
	}
}
```

**Note:** This is a starting implementation. WorkOS AuthKit may have a different verification pattern - check their docs if this doesn't work. The key is: read token from cookie, validate it, attach user to request.

---

## Step 5: Create Auth Routes

Create file `src/api/auth.ts`:

```typescript
import type { FastifyInstance } from "fastify";
import { workos, clientId, redirectUri } from "../lib/workos";

export function registerAuthRoutes(fastify: FastifyInstance): void {
	// Login - redirect to WorkOS
	fastify.get("/auth/login", async (_request, reply) => {
		const authorizationUrl = workos.userManagement.getAuthorizationUrl({
			clientId,
			redirectUri,
			provider: "authkit",
		});

		reply.redirect(authorizationUrl);
	});

	// Callback - exchange code for user
	fastify.get("/auth/callback", async (request, reply) => {
		const { code } = request.query as { code?: string };

		if (!code) {
			reply.code(400).send({ error: "Missing authorization code" });
			return;
		}

		try {
			const { user, accessToken, refreshToken } =
				await workos.userManagement.authenticateWithCode({
					clientId,
					code,
				});

			// Set tokens in cookies
			reply.setCookie("accessToken", accessToken, {
				httpOnly: true,
				secure: process.env.NODE_ENV === "production",
				sameSite: "lax",
				path: "/",
				maxAge: 60 * 60 * 24 * 7, // 7 days
			});

			if (refreshToken) {
				reply.setCookie("refreshToken", refreshToken, {
					httpOnly: true,
					secure: process.env.NODE_ENV === "production",
					sameSite: "lax",
					path: "/",
					maxAge: 60 * 60 * 24 * 30, // 30 days
				});
			}

			// Redirect to home page
			reply.redirect("/");
		} catch (error) {
			fastify.log.error(error);
			reply.code(500).send({ error: "Authentication failed" });
		}
	});

	// Logout - clear cookies
	fastify.get("/auth/logout", async (_request, reply) => {
		reply.clearCookie("accessToken", { path: "/" });
		reply.clearCookie("refreshToken", { path: "/" });
		reply.redirect("/");
	});

	// Get current user (for debugging)
	fastify.get("/auth/me", async (request, reply) => {
		const accessToken = request.cookies.accessToken;

		if (!accessToken) {
			reply.code(401).send({ error: "Not authenticated" });
			return;
		}

		try {
			const { user } = await workos.userManagement.getUser(accessToken);
			reply.send({ user });
		} catch (error) {
			reply.code(401).send({ error: "Invalid token" });
		}
	});
}
```

---

## Step 6: Update Health Routes with Auth-Required Endpoint

Update `src/api/health.ts`:

```typescript
import type { FastifyInstance } from "fastify";
import { convex } from "../lib/convex";
import { api } from "../../convex/_generated/api";
import { authMiddleware } from "../middleware/auth";

export function registerHealthRoutes(fastify: FastifyInstance): void {
	// Public health check (no auth)
	fastify.get("/health", async (_request, _reply) => {
		try {
			const convexHealth = await convex.query(api.health.check);
			return {
				status: "ok",
				timestamp: new Date().toISOString(),
				convex: convexHealth.status === "ok" ? "connected" : "error",
			};
		} catch (_error) {
			return {
				status: "ok",
				timestamp: new Date().toISOString(),
				convex: "disconnected",
			};
		}
	});

	// Auth-required health check
	fastify.get(
		"/api/health",
		{ preHandler: authMiddleware },
		async (request, _reply) => {
			try {
				// For now, just verify auth works
				// Later: call convex/healthAuth with token
				const convexHealth = await convex.query(api.health.check);
				return {
					status: "ok",
					timestamp: new Date().toISOString(),
					user: request.user,
					convex: convexHealth.status === "ok" ? "connected" : "error",
				};
			} catch (_error) {
				return {
					status: "ok",
					timestamp: new Date().toISOString(),
					user: request.user,
					convex: "disconnected",
				};
			}
		},
	);
}
```

---

## Step 7: Update Server Entry Point

Update `src/index.ts`:

```typescript
import Fastify from "fastify";
import cookie from "@fastify/cookie";
import { registerHealthRoutes } from "./api/health";
import { registerAuthRoutes } from "./api/auth";

const fastify = Fastify({
	logger: true,
});

// Register cookie plugin
const cookieSecret = process.env.COOKIE_SECRET;
if (!cookieSecret) {
	throw new Error("COOKIE_SECRET environment variable is required");
}

fastify.register(cookie, {
	secret: cookieSecret,
	parseOptions: {},
});

// Register routes
registerHealthRoutes(fastify);
registerAuthRoutes(fastify);

const start = async () => {
	try {
		await fastify.listen({ port: 5001 });
		fastify.log.info("PromptDB server running on port 5001");
	} catch (err) {
		fastify.log.error(err);
		process.exit(1);
	}
};

start();
```

---

## Step 8: Create Convex Auth Config

Create file `convex/auth.config.ts`:

```typescript
export default {
	providers: [
		{
			// WorkOS issuer domain
			domain: "https://api.workos.com",
			applicationID: process.env.WORKOS_CLIENT_ID,
		},
	],
};
```

**Note:** This config tells Convex how to validate JWTs from WorkOS. The exact format may need adjustment based on Convex docs.

---

## Step 9: Create Auth-Required Convex Query

Create file `convex/healthAuth.ts`:

```typescript
import { query } from "./_generated/server";

export const check = query({
	args: {},
	handler: async (ctx) => {
		const identity = await ctx.auth.getUserIdentity();

		if (!identity) {
			throw new Error("Not authenticated");
		}

		return {
			status: "ok",
			user: {
				id: identity.subject,
				email: identity.email,
				name: identity.name,
			},
		};
	},
});
```

---

## Step 10: Run Quality Checks

```bash
bun run lint
bun run typecheck
```

Fix any errors that come up.

---

## Step 11: Sync Convex

```bash
npx convex dev --local --once
```

This pushes the new auth config and healthAuth query to local Convex.

---

## Step 12: Verify

**Terminal 1 - Convex:**
```bash
bun run convex:dev
```

**Terminal 2 - Fastify:**
```bash
bun run dev
```

**Browser tests:**

1. Go to `http://localhost:5001/health` - should work (no auth)
2. Go to `http://localhost:5001/api/health` - should return 401
3. Go to `http://localhost:5001/auth/login` - should redirect to WorkOS
4. Log in with WorkOS
5. Should redirect back to `http://localhost:5001/`
6. Go to `http://localhost:5001/auth/me` - should show your user
7. Go to `http://localhost:5001/api/health` - should work now with user info

---

## Troubleshooting

**"Invalid redirect URI"**
→ Check WorkOS dashboard matches exactly: `http://localhost:5001/auth/callback`

**Cookie not being set**
→ Check browser dev tools → Application → Cookies
→ Make sure COOKIE_SECRET is set in .env.local

**401 on /api/health after login**
→ Check the accessToken cookie exists
→ May need to adjust how we validate the token in middleware

**CORS errors**
→ Check WorkOS dashboard CORS origin: `http://localhost:5001`

---

## When Done

Report back to the orchestrating session. We'll verify and may need to adjust the middleware/auth flow based on how WorkOS AuthKit actually works.
