# MCP Search Tools Reference

Research from 2025-12-26 comparing search tools for documentation/code lookup.

## Tool Comparison

| Tool | Best For | Token Cost | Speed |
|------|----------|------------|-------|
| **Context7** | Official library docs, version-specific | Low (~1k) | Fast |
| **Exa** | Semantic code search, broader context | Medium (~5k) | Medium |
| **WebSearch** | Discovery, finding sources, current events | Low (~500) | Fast |
| **Firecrawl scrape** | Full content from ONE specific URL | High (~8k) | Medium |
| **Firecrawl search** | Discovery with descriptions | Low (~500) | Medium |

## When to Use Each

| Scenario | Best Choice |
|----------|-------------|
| "How do I use X in library Y?" | **Context7** |
| "What are best practices for Z?" | **Exa** (broader context) |
| "Find resources about topic" | **WebSearch** (discovery) |
| "Get full content from this URL" | **Firecrawl scrape** |
| "Search web with descriptions" | **Firecrawl search** (no scrapeOptions!) |

## Gotchas

### Firecrawl Search
- **DO NOT** use `scrapeOptions` parameter - it scrapes every result and blows up context (46k+ tokens)
- Use for discovery only, then selectively scrape specific URLs

### Context7
- Requires two-step: `resolve-library-id` first, then `get-library-docs`
- Returns code snippets with source links
- Best for official, curated documentation

### Exa
- `get_code_context_exa` is optimized for code/docs
- `web_search_exa` for general search
- Returns clean markdown, good for code examples

## Recommended Pattern

1. **Search** (WebSearch, Exa, or Firecrawl search) → find relevant URLs
2. **Evaluate** → pick the most relevant result
3. **Scrape** (Firecrawl scrape) → get full content from that one URL

Or for library docs:
1. **Context7 resolve** → get library ID
2. **Context7 get-docs** → get topic-specific docs with code examples
