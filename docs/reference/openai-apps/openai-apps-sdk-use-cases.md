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

- [Why start with use cases](https://developers.openai.com/apps-sdk/plan/use-case#why-start-with-use-cases)
- [Gather inputs](https://developers.openai.com/apps-sdk/plan/use-case#gather-inputs)
- [Define evaluation prompts](https://developers.openai.com/apps-sdk/plan/use-case#define-evaluation-prompts)
- [Scope the minimum lovable feature](https://developers.openai.com/apps-sdk/plan/use-case#scope-the-minimum-lovable-feature)
- [Translate use cases into tooling](https://developers.openai.com/apps-sdk/plan/use-case#translate-use-cases-into-tooling)
- [Prepare for iteration](https://developers.openai.com/apps-sdk/plan/use-case#prepare-for-iteration)

Copy PageMore page actions

Copy PageMore page actions

# Research use cases

Identify and prioritize Apps SDK use cases.

## Why start with use cases

Every successful Apps SDK app starts with a crisp understanding of what the user is trying to accomplish. Discovery in ChatGPT is model-driven: the assistant chooses your app when your tool metadata, descriptions, and past usage align with the user’s prompt and memories. That only works if you have already mapped the tasks the model should recognize and the outcomes you can deliver.

Use this page to capture your hypotheses, pressure-test them with prompts, and align your team on scope before you define tools or build components.

## Gather inputs

Begin with qualitative and quantitative research:

- **User interviews and support requests** – capture the jobs-to-be-done, terminology, and data sources users rely on today.
- **Prompt sampling** – list direct asks (e.g., “show my Jira board”) and indirect intents (“what am I blocked on for the launch?”) that should route to your app.
- **System constraints** – note any compliance requirements, offline data, or rate limits that will influence tool design later.

Document the user persona, the context they are in when they reach for ChatGPT, and what success looks like in a single sentence for each scenario.

## Define evaluation prompts

Decision boundary tuning is easier when you have a golden set to iterate against. For each use case:

1. **Author at least five direct prompts** that explicitly reference your data, product name, or verbs you expect the user to say.
2. **Draft five indirect prompts** where the user states a goal but not the tool (“I need to keep our launch tasks organized”).
3. **Add negative prompts** that should _not_ trigger your app so you can measure precision.

Use these prompts later in [Optimize metadata](https://developers.openai.com/apps-sdk/guides/optimize-metadata) to hill-climb on recall and precision without overfitting to a single request.

## Scope the minimum lovable feature

For each use case decide:

- **What information must be visible inline** to answer the question or let the user act.
- **Which actions require write access** and whether they should be gated behind confirmation in developer mode.
- **What state needs to persist** between turns—for example, filters, selected rows, or draft content.

Rank the use cases based on user impact and implementation effort. A common pattern is to ship one P0 scenario with a high-confidence component, then expand to P1 scenarios once discovery data confirms engagement.

## Translate use cases into tooling

Once a scenario is in scope, draft the tool contract:

- Inputs: the parameters the model can safely provide. Keep them explicit, use enums when the set is constrained, and document defaults.
- Outputs: the structured content you will return. Add fields the model can reason about (IDs, timestamps, status) in addition to what your UI renders.
- Component intent: whether you need a read-only viewer, an editor, or a multiturn workspace. This influences the [component planning](https://developers.openai.com/apps-sdk/plan/components) and storage model later.

Review these drafts with stakeholders—especially legal or compliance teams—before you invest in implementation. Many integrations require PII reviews or data processing agreements before they can ship to production.

## Prepare for iteration

Even with solid planning, expect to revise prompts and metadata after your first dogfood. Build time into your schedule for:

- Rotating through the golden prompt set weekly and logging tool selection accuracy.
- Collecting qualitative feedback from early testers in ChatGPT developer mode.
- Capturing analytics (tool calls, component interactions) so you can measure adoption.

These research artifacts become the backbone for your roadmap, changelog, and success metrics once the app is live.

[Next\\
\\
Define tools](https://developers.openai.com/apps-sdk/plan/tools)