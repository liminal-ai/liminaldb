[![OpenAI Developers](https://developers.openai.com/OpenAI_Developers.svg)](https://developers.openai.com/)

[Resources](https://developers.openai.com/resources)

[Codex](https://developers.openai.com/codex)

[ChatGPT](https://developers.openai.com/chatgpt)

[Apps SDK\\
\\
Build apps to extend ChatGPT](https://developers.openai.com/apps-sdk) [Agentic Commerce\\
\\
Build commerce flows in ChatGPT](https://developers.openai.com/commerce)

[Blog](https://developers.openai.com/blog)

## Search the ChatGPT docs

Close

Clear

Primary navigation

ChatGPT

ResourcesCodexChatGPTBlog

Clear

1. [ChatGPT](https://developers.openai.com/chatgpt)
2. >
[Apps SDK](https://developers.openai.com/apps-sdk)

- [Home](https://developers.openai.com/apps-sdk)
- [Quickstart](https://developers.openai.com/apps-sdk/quickstart)

### Core Concepts

- [MCP Server](https://developers.openai.com/apps-sdk/concepts/mcp-server)
- [UX principles](https://developers.openai.com/apps-sdk/concepts/ux-principles)
- [UI guidelines](https://developers.openai.com/apps-sdk/concepts/ui-guidelines)

### Plan

- [Research use cases](https://developers.openai.com/apps-sdk/plan/use-case)
- [Define tools](https://developers.openai.com/apps-sdk/plan/tools)
- [Design components](https://developers.openai.com/apps-sdk/plan/components)

### Build

- [Set up your server](https://developers.openai.com/apps-sdk/build/mcp-server)
- [Build your ChatGPT UI](https://developers.openai.com/apps-sdk/build/chatgpt-ui)
- [Authenticate users](https://developers.openai.com/apps-sdk/build/auth)
- [Manage state](https://developers.openai.com/apps-sdk/build/state-management)
- [Monetize your app](https://developers.openai.com/apps-sdk/build/monetization)
- [Examples](https://developers.openai.com/apps-sdk/build/examples)

### Deploy

- [Deploy your app](https://developers.openai.com/apps-sdk/deploy)
- [Connect from ChatGPT](https://developers.openai.com/apps-sdk/deploy/connect-chatgpt)
- [Test your integration](https://developers.openai.com/apps-sdk/deploy/testing)
- [Submit your app](https://developers.openai.com/apps-sdk/deploy/submission)

### Guides

- [Optimize Metadata](https://developers.openai.com/apps-sdk/guides/optimize-metadata)
- [Security & Privacy](https://developers.openai.com/apps-sdk/guides/security-privacy)
- [Troubleshooting](https://developers.openai.com/apps-sdk/deploy/troubleshooting)

### Resources

- [App submission guidelines](https://developers.openai.com/apps-sdk/app-submission-guidelines)
- [Reference](https://developers.openai.com/apps-sdk/reference)

Search
⌘

K

1. [ChatGPT](https://developers.openai.com/chatgpt)
2. >
[Apps SDK](https://developers.openai.com/apps-sdk)

- [Home](https://developers.openai.com/apps-sdk)
- [Quickstart](https://developers.openai.com/apps-sdk/quickstart)

### Core Concepts

- [MCP Server](https://developers.openai.com/apps-sdk/concepts/mcp-server)
- [UX principles](https://developers.openai.com/apps-sdk/concepts/ux-principles)
- [UI guidelines](https://developers.openai.com/apps-sdk/concepts/ui-guidelines)

### Plan

- [Research use cases](https://developers.openai.com/apps-sdk/plan/use-case)
- [Define tools](https://developers.openai.com/apps-sdk/plan/tools)
- [Design components](https://developers.openai.com/apps-sdk/plan/components)

### Build

- [Set up your server](https://developers.openai.com/apps-sdk/build/mcp-server)
- [Build your ChatGPT UI](https://developers.openai.com/apps-sdk/build/chatgpt-ui)
- [Authenticate users](https://developers.openai.com/apps-sdk/build/auth)
- [Manage state](https://developers.openai.com/apps-sdk/build/state-management)
- [Monetize your app](https://developers.openai.com/apps-sdk/build/monetization)
- [Examples](https://developers.openai.com/apps-sdk/build/examples)

### Deploy

- [Deploy your app](https://developers.openai.com/apps-sdk/deploy)
- [Connect from ChatGPT](https://developers.openai.com/apps-sdk/deploy/connect-chatgpt)
- [Test your integration](https://developers.openai.com/apps-sdk/deploy/testing)
- [Submit your app](https://developers.openai.com/apps-sdk/deploy/submission)

### Guides

- [Optimize Metadata](https://developers.openai.com/apps-sdk/guides/optimize-metadata)
- [Security & Privacy](https://developers.openai.com/apps-sdk/guides/security-privacy)
- [Troubleshooting](https://developers.openai.com/apps-sdk/deploy/troubleshooting)

### Resources

- [App submission guidelines](https://developers.openai.com/apps-sdk/app-submission-guidelines)
- [Reference](https://developers.openai.com/apps-sdk/reference)

Copy PageMore page actions

Copy PageMore page actions

# Deploy your app

Learn how to deploy your MCP server

## Deployment options

Once you have a working MCP server and component bundle, host them behind a stable HTTPS endpoint. Deployment platforms that work well with Apps SDK include:

- **Managed containers** – Fly.io, Render, or Railway for quick spin-up and automatic TLS.
- **Cloud serverless** – Google Cloud Run or Azure Container Apps if you need scale-to-zero, keeping in mind that long cold starts can interrupt streaming HTTP.
- **Kubernetes** – for teams that already run clusters. Front your pods with an ingress controller that supports server-sent events.

Regardless of platform, make sure `/mcp` stays responsive, supports streaming responses, and returns appropriate HTTP status codes for errors.

## Local development

During development you can expose your local server to ChatGPT using a tunnel such as ngrok:

```
ngrok http 2091
# https://<subdomain>.ngrok.app/mcp → http://127.0.0.1:2091/mcp


```

Keep the tunnel running while you iterate on your connector. When you change code:

1. Rebuild the component bundle (`npm run build`).
2. Restart your MCP server.
3. Refresh the connector in ChatGPT settings to pull the latest metadata.

## Environment configuration

- **Secrets** – store API keys or OAuth client secrets outside your repo. Use platform-specific secret managers and inject them as environment variables.
- **Logging** – log tool-call IDs, request latency, and error payloads. This helps debug user reports once the connector is live.
- **Observability** – monitor CPU, memory, and request counts so you can right-size your deployment.

## Dogfood and rollout

Before launching broadly:

1. **Gate access** – keep your connector behind developer mode or a Statsig experiment flag until you are confident in stability.
2. **Run golden prompts** – exercise the discovery prompts you drafted during planning and note precision/recall changes with each release.
3. **Capture artifacts** – record screenshots or screen captures showing the component in MCP Inspector and ChatGPT for reference.

When you are ready for production, update directory metadata, confirm auth and storage are configured correctly, and publish change notes in [Release Notes](https://developers.openai.com/apps-sdk/release-notes).

## Next steps

- Connect your deployed endpoint to ChatGPT using the steps in [Connect from ChatGPT](https://developers.openai.com/apps-sdk/deploy/connect-chatgpt).
- Validate tooling and telemetry with the [Test your integration](https://developers.openai.com/apps-sdk/deploy/testing) guide.
- Keep a troubleshooting playbook handy via [Troubleshooting](https://developers.openai.com/apps-sdk/deploy/troubleshooting) so on-call responders can quickly diagnose issues.

[Next\\
\\
Connect from ChatGPT](https://developers.openai.com/apps-sdk/deploy/connect-chatgpt)