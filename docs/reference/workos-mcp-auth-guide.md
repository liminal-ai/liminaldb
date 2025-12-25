# WorkOS MCP Auth Developer Guide

**Source:** https://workos.com/blog/mcp-auth-developer-guide
**Date:** October 7, 2025

---

## Introduction

As AI agents grow more capable every day and can access more systems with the help of MCP servers, the question of security becomes crucial. These agents can move money, change account state, approve refunds, or deploy builds. You need to know _who_ is calling and _what_ they are authorized to do, and you need a fast way to turn access off when things change. Authentication and authorization move from a checklist to the core of the design.

This guide explains how MCP handles authentication and authorization in detail. It starts by setting the stage with the overall structure of MCP and the role of auth inside it. From there, it explores how to secure an MCP server with OAuth 2.1 and PKCE, discovery using Protected Resource Metadata (RFC 9728) and Authorization Server Metadata (RFC 8414), Dynamic Client Registration, correct JWT validation, and RBAC enforcement.

## MCP Architecture 101

To understand auth in MCP, let's start with how it organizes communication.

There are three parties: the host, the client, and the server.

- The **host** is an AI-powered application (like Claude Desktop or Cursor) with which the end-user interacts. A host runs one or more **MCP clients**.
- The **client** handles the MCP protocol on the app's side and maintains a dedicated connection to a server. Each client connects directly to a single **MCP server**.
- The **server** is where logic lives and actions happen. It performs computations, fetches data, or triggers operations that affect the outside world.

Every request crossing the boundary between client and server must be authenticated and authorized.

- **Authentication** answers: "Who is making this request?"
- **Authorization** answers: "What can they do once they are identified?"

This one-to-one connection between client and server keeps the design simple. Each server can enforce its own policies and token validation without worrying about multiple clients sharing a session or identity.

## The Evolution of MCP Auth

In early versions, MCP focused on connection structure, like defining how servers expose tools and handle prompts. But as developers started using MCP to bridge AI systems with production APIs, one challenge became impossible to ignore: secure identity and access control.

That is why MCP now relies on OAuth 2.1, the same protocol that already secures much of the modern web, from login flows to API tokens. MCP builds on top of OAuth, so developers can use familiar patterns instead of inventing new ones.

## Authentication Patterns in MCP

Every MCP server needs a way to authenticate calls, but not all use cases are the same. In practice, you'll see two main approaches: API keys and OAuth.

### 1. Service access via API keys

Many MCP servers start with a simple API key for authentication. This method is straightforward and works well for local setups, quick prototypes, or demos. However, in production environments, it introduces significant risks:

1. **Unlimited access:** Anyone who obtains the key can use every feature the server provides. There is no way to restrict access to specific actions or resources.
2. **Hard to rotate:** If the key is leaked, it must be replaced everywhere it's used, which can break integrations and cause downtime.
3. **No expiry or traceability:** API keys typically never expire and cannot be tied to individual users or devices, which makes auditing and incident response difficult.

API keys remain useful for simple service-to-service connections or local development. But they should be treated as temporary measures, not long-term solutions.

### 2. User or service access via OAuth

For most production scenarios, **OAuth 2.1** is the recommended standard for MCP authentication. OAuth replaces static keys with **scoped, time-limited tokens** that are issued by a trusted authorization server.

- Each client or user is granted only the specific permissions (scopes) they need.
- Tokens expire automatically and can be revoked without affecting other clients.
- Activities are auditable, since each token is linked to a distinct client identity.

When no user is present and machines communicate directly, the OAuth client credentials flow provides secure, revocable tokens for service access.

When a user is involved, the authorization code flow with PKCE or device flow is preferred.

## The Core OAuth Flow for MCP

At the heart of MCP authorization is the standard OAuth 2.1 flow. In a typical setup, three actors are involved:

- **MCP client**: a local LLM app such as Claude Desktop.
- **OAuth server**: an auth provider like WorkOS.
- **MCP server**: the server doing the job you want, like GitHub (for working on issues) or Playwright (for testing UI features).

Here's what happens step by step:

1. The user uses the MCP client to access a feature that requires communication with an MCP server (e.g., create a GitHub issue).
2. The client opens a browser and redirects the user to the OAuth server (e.g., WorkOS).
3. The user logs in and grants permission for the client to access their account.
4. The OAuth server returns an authorization code to the client.
5. The client exchanges this code for an access token.
6. The client uses the access token to call the MCP server.

This token represents delegated, time-limited permission to perform specific actions on behalf of the user.

Unlike an API key, which gives full, permanent access, an OAuth token can expire, be revoked, and be scoped to specific permissions such as `read:messages` or `write:files`.

## Handle Public Clients with PKCE

The flow we just saw is called Authorization Code Flow. For example, in the 5th step, when the client exchanges the _authorization code_ for an _access token_, the request also includes a secret password, known as the _client secret_. This is known only to the OAuth server and the client making the request.

This works fine for confidential clients, i.e., apps that run on servers and can safely store secrets. However, most MCP clients are public clients, which means they cannot safely store secrets.

**PKCE** (Proof Key for Code Exchange, RFC 7636) solves this problem elegantly.

When starting the authorization flow, the client generates a _code verifier_, a random string used only once, and hashes it to produce a _code challenge_.

The _challenge_ is sent in the initial authorization request. Later, when exchanging the authorization code for an access token, the client must present the original verifier.

If an attacker intercepts the authorization code in transit, they will not have the verifier needed to complete the exchange.

In practice, this means that MCP clients can authenticate securely without ever having to embed a _client secret_.

PKCE was originally designed for mobile apps, but it has become the standard for any public client, including those in MCP. And now with OAuth 2.1, it's required for all clients, both public and confidential.

## Protected Resource Metadata: The MCP Server's Security Guide

Once a client knows the MCP server's URL, it still needs to understand how to interact securely:

- What token formats does the server accept?
- Which authorization servers does it trust?
- Which scopes are available?

Instead of hardcoding this configuration, the server publishes a **machine-readable document** at a well-known URL:

```
/.well-known/oauth-protected-resource
```

This is defined in RFC 9728, and it's basically a discovery document.

When a client connects without credentials, the server should respond with a 401 Unauthorized and a WWW-Authenticate header pointing to that URL.

Example:

```json
{
  "resource": "https://api.example.com/mcp",
  "authorization_servers": ["https://auth.example.com"],
  "bearer_methods_supported": ["header"],
  "jwks_uri": "https://api.example.com/.well-known/jwks.json"
}
```

This metadata provides the client with everything it needs to know: the server's identity, trusted authorization servers, supported bearer methods, and where to find the signing keys.

## Authorization Server Metadata: The OAuth Server's Communication Manual

Once the client knows which authorization server to use, it needs to understand **how** to communicate with it.

RFC 8414 defines how authorization servers can publish their capabilities via their own well-known endpoint:

```
/.well-known/oauth-authorization-server
```

This document lists all the information needed to complete the flow: the login URL, token endpoint, supported scopes, grant types, and PKCE methods.

Example:

```json
{
  "issuer": "https://auth.example.com",
  "authorization_endpoint": "https://auth.example.com/oauth/authorize",
  "token_endpoint": "https://auth.example.com/oauth/token",
  "registration_endpoint": "https://auth.example.com/oauth/register",
  "jwks_uri": "https://auth.example.com/.well-known/jwks.json",
  "code_challenge_methods_supported": ["S256"],
  "grant_types_supported": ["authorization_code", "refresh_token"],
  "scopes_supported": ["read:files"],
  "token_endpoint_auth_methods_supported": ["none"]
}
```

This means clients no longer need hand-written configurations for each provider. They can follow the metadata pointers and adapt automatically to new environments.

Importantly, the **OAuth server** and the **MCP server** can be separate. You can use an existing identity provider like WorkOS or Okta to handle login while your MCP server focuses on domain logic.

## Dynamic Client Registration: How Clients Introduce Themselves

The last piece of the puzzle is registration.

Traditionally, OAuth clients had to be registered manually with each authorization server, which doesn't scale when new MCP servers and clients can appear at any time.

RFC 7591 solves this by allowing **clients to register themselves** dynamically.

Instead of an admin manually creating entries, the client sends a POST request to the `registration_endpoint` with its metadata, supported grant types, and redirect URIs.

Example (simplified):

```json
{
  "client_name": "My MCP Client",
  "redirect_uris": ["https://localhost:1234/callback"],
  "grant_types": ["authorization_code"],
  "token_endpoint_auth_method": "none"
}
```

The OAuth server responds with a new `client_id` (and optionally a secret, if appropriate).

This makes MCP ecosystems truly **self-serve**: any compatible client can connect to any compatible server, without manual setup or approval steps.

## Access Tokens: Validate Before Use

Once an MCP client obtains an access token, it includes it as a **bearer token** in every request to the MCP server. The server must then verify that the token is valid and trusted before performing any action.

Most OAuth tokens are **JWTs (JSON Web Tokens)**, which carry signed claims that describe the token's origin and permissions.

A JWT consists of 3 parts:

- **Header**: Specifies the token _type_ ("JWT") and the signing algorithm used to create the token's _signature_ (like HMAC SHA256 or RSA).
- **Payload**: Contains the **claims**: pieces of information about the user. There are standard claims and custom ones. Some examples are:
  - _sub_: Standard claim that specifies the subject of the JWT, for example, a user ID.
  - _iss_: Standard claim that specifies the issuer of the JWT.
  - _aud_: Standard claim that specifies the recipient for which the JWT is intended.
  - _exp_: Standard claim that specifies the time after which the JWT expires.
  - _email_: A custom claim that contains the user's email.
- **Signature**: A signature is used to verify that the sender of the JWT is who they say they are and to ensure that the message wasn't tampered with along the way.

To validate a JWT, the MCP server typically performs the following steps:

1. **Signature:** Verify the token using the public key (available from the `jwks_uri` in metadata). This ensures the token was issued by a trusted authorization server.
2. **Expiry:** Ensure the token has not expired. Check the expiration time (`exp`) and the not-before time (`nbf`) claims.
3. **Issuer (`iss`):** Confirm the token's `iss` claim matches the expected authorization server URL.
4. **Audience (`aud`):** Check that the token is meant for your MCP server's resource identifier.
5. **Scope:** Confirm the token includes the scope required for the requested action (e.g., `read_report`).

## Enforcing Access Control with RBAC

Token validation proves that a request is authentic. For example, the client X has been authorized by the user to read financial information. But is the user actually allowed to do that?

The most common strategy to enforce access control is Role-Based Access Control (RBAC), where roles map to sets of permissions that correspond to OAuth scopes.

For example:

| Role | Allowed Scopes | Example Action |
|------|----------------|----------------|
| reader | `read:data` | View analytics data |
| editor | `read:data`, `write:data` | Update content |

When the MCP server validates a token, it checks the token's scopes and matches them against the roles defined in its own policy. This ensures that clients can only perform actions that correspond to their assigned roles.

## Putting It All Together

Together, these specifications form the backbone of OAuth in MCP:

- **OAuth 2.1** handles token issuance and permission scopes.
- **PKCE** secures public clients without secrets.
- **RFC 9728** standardizes how servers advertise their security configuration.
- **RFC 8414** describes how authorization servers expose their capabilities.
- **RFC 7591** enables fully dynamic registration at scale.

These specifications form a complete authorization workflow:

1. **Discovery:** The MCP client connects, receives a 401, and retrieves the server's protected resource metadata.
2. **Registration:** The client registers dynamically with the authorization server if necessary.
3. **Authorization:** The user or service performs an OAuth 2.1 flow, secured with PKCE.
4. **Token use:** The client calls the MCP server using a bearer token. The server validates it based on issuer, audience, scope, and expiry.
5. **Enforcement:** The MCP server enforces scopes and permissions defined by the authorization server or by its own policy.

---

## Use WorkOS as Your OAuth Server for MCP

You can wire up everything you just read with WorkOS in two ways. Both follow OAuth 2.1, support PKCE and Dynamic Client Registration, and work across compliant MCP clients.

### Option 1: Bring Your Own Users (OAuth Bridge)

Use this when you already have an app with its own login and user store. WorkOS Connect acts as an OAuth bridge: MCP clients authenticate through WorkOS, users sign in to your app, and WorkOS issues tokens the MCP client can use with your MCP server.

**What you implement:**
- Protected Resource Metadata on your MCP server
- A 401 with `WWW-Authenticate` pointing to it
- JWT validation using WorkOS JWKS

**What WorkOS handles:**
- Client authentication flow
- Consent
- Issuing tokens
- Dynamic Client Registration
- Metadata at `/.well-known/oauth-authorization-server`

For more details, see the [WorkOS Connect docs](https://workos.com/docs/authkit/connect/standalone).

### Option 2: Managed Users with AuthKit

Don't want to run user auth? Use AuthKit for your logins. AuthKit hosts the full OAuth flow, clients self-register via Dynamic Client Registration, and your MCP server validates tokens it receives.

**What you implement:**
- The same Protected Resource Metadata and JWT checks
- List AuthKit under `authorization_servers`

**What WorkOS handles:**
- Login UI
- Client and user authentication
- Consent
- Issuing tokens
- Dynamic Client Registration
- Introspection
- The AS metadata endpoint

For more details, see the [AuthKit MCP docs](https://workos.com/docs/authkit/mcp).

### What the Integration Looks Like

1. **Discovery**: Serve `/.well-known/oauth-protected-resource` on your MCP server and include WorkOS/AuthKit under `authorization_servers`. Clients that hit a 401 learn how to start OAuth automatically.

2. **Registration**: Enable Dynamic Client Registration in the WorkOS dashboard so MCP clients can self-register.

3. **Token use**: Validate JWTs against the AS `jwks_uri`, check `iss`, `aud`, `exp`, and required scopes before executing any tool call.

All public MCP clients use PKCE; WorkOS enforces it in supported flows.

### Add Roles and Permissions with WorkOS RBAC

Map OAuth scopes to internal roles and permissions using WorkOS RBAC:

- Define roles like `reader` and `editor`
- Assign multiple roles per user
- Use role hierarchies so higher-privilege roles inherit lower-level permissions

Each access token will include the granted permissions as `scopes`. Your MCP server should enforce these permissions after token validation.

---

## Final Thoughts

OAuth gives you a practical recipe for secure AI flows: discoverability with well-known endpoints, client onboarding with Dynamic Client Registration, OAuth 2.1 with PKCE for public clients, and strict JWT validation at the server.

Whether you bring your own users with WorkOS or use AuthKit to manage them, you can ship an MCP server that is least-privilege by default, auditable, and easy to maintain.

Start small: publish `/.well-known/oauth-protected-resource`, enable Dynamic Client Registration, validate tokens against `iss`, `aud`, and `exp`, map scopes to roles, and log decisions. From there, iterate on scopes and roles as real workloads arrive, and you will have an auth foundation that scales with your product, not against it.

---

## Related Links

- [WorkOS AuthKit MCP Docs](https://workos.com/docs/authkit/mcp)
- [WorkOS Connect Docs](https://workos.com/docs/authkit/connect/standalone)
- [WorkOS RBAC Docs](https://workos.com/docs/rbac)
- [MCP Authorization Spec](https://modelcontextprotocol.io/specification/2025-03-26/basic/authorization)
- [RFC 9728 - Protected Resource Metadata](https://datatracker.ietf.org/doc/rfc9728/)
- [RFC 8414 - Authorization Server Metadata](https://datatracker.ietf.org/doc/html/rfc8414)
- [RFC 7591 - Dynamic Client Registration](https://datatracker.ietf.org/doc/html/rfc7591)
