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

- [Goals](https://developers.openai.com/apps-sdk/deploy/testing#goals)
- [Unit test your tool handlers](https://developers.openai.com/apps-sdk/deploy/testing#unit-test-your-tool-handlers)
- [Use MCP Inspector during development](https://developers.openai.com/apps-sdk/deploy/testing#use-mcp-inspector-during-development)
- [Validate in ChatGPT developer mode](https://developers.openai.com/apps-sdk/deploy/testing#validate-in-chatgpt-developer-mode)
- [Connect via the API Playground](https://developers.openai.com/apps-sdk/deploy/testing#connect-via-the-api-playground)
- [Regression checklist before launch](https://developers.openai.com/apps-sdk/deploy/testing#regression-checklist-before-launch)

Copy PageMore page actions

Copy PageMore page actions

# Test your integration

Testing strategies for Apps SDK apps.

## Goals

Testing validates that your connector behaves predictably before you expose it to users. Focus on three areas: tool correctness, component UX, and discovery precision.

## Unit test your tool handlers

- Exercise each tool function directly with representative inputs. Verify schema validation, error handling, and edge cases (empty results, missing IDs).
- Include automated tests for authentication flows if you issue tokens or require linking.
- Keep test fixtures close to your MCP code so they stay up to date as schemas evolve.

## Use MCP Inspector during development

The [MCP Inspector](https://modelcontextprotocol.io/docs/tools/inspector) is the fastest way to debug your server locally:

1. Run your MCP server.
2. Launch the inspector: `npx @modelcontextprotocol/inspector@latest`.
3. Enter your server URL (for example `http://127.0.0.1:2091/mcp`).
4. Click **List Tools** and **Call Tool** to inspect the raw requests and responses.

Inspector renders components inline and surfaces errors immediately. Capture screenshots for your launch review.

## Validate in ChatGPT developer mode

After your connector is reachable over HTTPS:

- Link it in **Settings → Connectors → Developer mode**.
- Toggle it on in a new conversation and run through your golden prompt set (direct, indirect, negative). Record when the model selects the right tool, what arguments it passed, and whether confirmation prompts appear as expected.
- Test mobile layouts by invoking the connector in the ChatGPT iOS or Android apps.

## Connect via the API Playground

If you need raw logs or want to test without the full ChatGPT UI, open the [API Playground](https://platform.openai.com/playground):

1. Choose **Tools → Add → MCP Server**.
2. Provide your HTTPS endpoint and connect.
3. Issue test prompts and inspect the JSON request/response pairs in the right-hand panel.

## Regression checklist before launch

- Tool list matches your documentation and unused prototypes are removed.
- Structured content matches the declared `outputSchema` for every tool.
- Widgets render without console errors, inject their own styling, and restore state correctly.
- OAuth or custom auth flows return valid tokens and reject invalid ones with meaningful messages.
- Discovery behaves as expected across your golden prompts and does not trigger on negative prompts.

Capture findings in a doc so you can compare results release over release. Consistent testing keeps your connector reliable as ChatGPT and your backend evolve.

[Previous\\
\\
Connect from ChatGPT](https://developers.openai.com/apps-sdk/deploy/connect-chatgpt) [Next\\
\\
Submit your app](https://developers.openai.com/apps-sdk/deploy/submission)