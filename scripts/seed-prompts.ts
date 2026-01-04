// Run with: bun run scripts/seed-prompts.ts

const prompts = [
	{
		slug: "explain-code",
		name: "Explain Code",
		description: "Get a clear explanation of any code snippet",
		content: `# Code Explanation Request

Please explain the following code in detail:

\`\`\`
{{code}}
\`\`\`

## What I need:
1. **Overview**: What does this code do at a high level?
2. **Step-by-step breakdown**: Walk through each significant part
3. **Key concepts**: What programming concepts are being used?
4. **Potential issues**: Any bugs, edge cases, or improvements?

Explain as if teaching a junior developer.`,
		tags: ["code", "learning", "documentation"],
	},
	{
		slug: "write-tests",
		name: "Write Unit Tests",
		description: "Generate comprehensive unit tests for your code",
		content: `# Unit Test Generation

Write comprehensive unit tests for the following code:

\`\`\`{{language}}
{{code}}
\`\`\`

## Requirements:
- Use **{{framework}}** testing framework
- Cover happy path and edge cases
- Include setup/teardown if needed
- Add descriptive test names
- Mock external dependencies

## Test categories to include:
1. Normal inputs
2. Boundary conditions
3. Error handling
4. Edge cases
5. Integration points`,
		tags: ["testing", "code", "tdd"],
	},
	{
		slug: "refactor-code",
		name: "Refactor Code",
		description: "Get suggestions to improve code quality and maintainability",
		content: `# Code Refactoring Request

Review and refactor this code for better quality:

\`\`\`{{language}}
{{code}}
\`\`\`

## Focus areas:
- **Readability**: Clear naming, structure
- **Maintainability**: Single responsibility, DRY
- **Performance**: Obvious optimizations
- **Type safety**: Better typing if applicable

Provide the refactored code with comments explaining each change.`,
		tags: ["code", "refactoring", "quality"],
	},
	{
		slug: "api-design",
		name: "API Design Review",
		description: "Review and improve REST API design patterns",
		content: `# API Design Review

Review this API endpoint design:

**Endpoint**: \`{{method}} {{path}}\`
**Purpose**: {{purpose}}

## Current request/response:
\`\`\`json
{{schema}}
\`\`\`

## Please evaluate:
1. RESTful conventions
2. Naming consistency
3. Error handling approach
4. Pagination strategy
5. Versioning considerations
6. Security implications

Suggest improvements with examples.`,
		tags: ["api", "design", "architecture"],
	},
	{
		slug: "debug-error",
		name: "Debug Error",
		description: "Help diagnose and fix errors with detailed analysis",
		content: `# Error Debugging Request

## The error:
\`\`\`
{{error_message}}
\`\`\`

## Context:
- **Language/Framework**: {{stack}}
- **What I was trying to do**: {{action}}
- **When it happens**: {{trigger}}

## Relevant code:
\`\`\`{{language}}
{{code}}
\`\`\`

Help me:
1. Understand what this error means
2. Identify the root cause
3. Provide a fix with explanation
4. Suggest how to prevent similar issues`,
		tags: ["debugging", "errors", "troubleshooting"],
	},
	{
		slug: "pr-description",
		name: "PR Description",
		description: "Generate a clear pull request description",
		content: `# Generate PR Description

Based on these changes, write a clear PR description:

## Changed files:
{{files}}

## Diff summary:
\`\`\`diff
{{diff}}
\`\`\`

## Generate:
1. **Title**: Concise, conventional commit style
2. **Summary**: 2-3 sentences on what and why
3. **Changes**: Bullet points of key modifications
4. **Testing**: How to verify the changes
5. **Screenshots**: Note if UI changes need screenshots`,
		tags: ["git", "workflow", "documentation"],
	},
	{
		slug: "commit-message",
		name: "Commit Message",
		description: "Write conventional commit messages",
		content: `# Generate Commit Message

Write a commit message for these changes:

\`\`\`diff
{{diff}}
\`\`\`

## Format:
- Use conventional commits: type(scope): description
- Types: feat, fix, docs, style, refactor, test, chore
- Keep first line under 72 characters
- Add body if needed for context

## Output:
Provide 2-3 options ranked by appropriateness.`,
		tags: ["git", "workflow"],
	},
	{
		slug: "system-prompt",
		name: "System Prompt Writer",
		description: "Create effective system prompts for AI assistants",
		content: `# System Prompt Creation

Create a system prompt for an AI assistant with these requirements:

**Role**: {{role}}
**Primary tasks**: {{tasks}}
**Tone**: {{tone}}
**Constraints**: {{constraints}}

## The system prompt should include:
1. Clear role definition
2. Behavioral guidelines
3. Response format preferences
4. Edge case handling
5. Things to avoid

Output a complete, production-ready system prompt.`,
		tags: ["prompts", "ai", "meta"],
	},
	{
		slug: "sql-query",
		name: "SQL Query Builder",
		description: "Generate optimized SQL queries from natural language",
		content: `# SQL Query Request

## Database schema:
\`\`\`sql
{{schema}}
\`\`\`

## What I need:
{{description}}

## Requirements:
- Database: {{database_type}}
- Optimize for: {{optimization}}
- Include: Comments explaining the query

Provide the SQL query with explanation of approach and any indexes that would help.`,
		tags: ["sql", "database", "queries"],
	},
	{
		slug: "code-review",
		name: "Code Review Checklist",
		description: "Comprehensive code review with actionable feedback",
		content: `# Code Review Request

Review this code for a pull request:

\`\`\`{{language}}
{{code}}
\`\`\`

## Review checklist:
- [ ] Logic correctness
- [ ] Error handling
- [ ] Security concerns
- [ ] Performance implications
- [ ] Test coverage
- [ ] Documentation
- [ ] Code style consistency

## Provide:
1. **Critical issues** (must fix)
2. **Suggestions** (should consider)
3. **Nitpicks** (optional improvements)
4. **Praise** (what's done well)

Be constructive and specific with line references.`,
		tags: ["code", "review", "quality"],
	},
];

async function _seed() {
	const response = await fetch("http://localhost:5001/api/prompts", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Cookie: document.cookie, // This won't work from CLI
		},
		body: JSON.stringify({ prompts }),
	});

	if (!response.ok) {
		console.error("Failed:", await response.text());
		return;
	}

	console.log("Created prompts:", await response.json());
}

// For browser console:
console.log("Paste this into browser console to seed prompts:");
console.log(`fetch('/api/prompts', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ prompts: ${JSON.stringify(prompts)} })
}).then(r => r.json()).then(console.log)`);
