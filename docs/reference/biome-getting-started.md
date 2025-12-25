# Biome Getting Started

> Source: https://biomejs.dev/guides/getting-started/

Biome is best installed as a development dependency of your projects.

## Installation

```bash
# npm
npm i -D -E @biomejs/biome

# pnpm
pnpm add -D -E @biomejs/biome

# bun
bun add -D -E @biomejs/biome
```

## Configuration

Generate a `biome.json` configuration file:

```bash
# bun
bunx --bun biome init

# npm
npx @biomejs/biome init
```

## Usage

### Command-line interface

```bash
# Format all files
bunx biome format --write

# Lint and apply safe fixes
bunx biome lint --write

# Format, lint, and organize imports
bunx biome check --write
```

### Editor integrations

Biome has first-party extensions for:
- VS Code
- IntelliJ
- Zed

### Continuous Integration

Run `biome ci` as part of your CI pipeline:

```bash
bunx biome ci
```

## Next Steps

- [Migrate from ESLint and Prettier](https://biomejs.dev/guides/migrate-eslint-prettier)
- [Configure Biome](https://biomejs.dev/guides/configure-biome)
- [CLI commands and options](https://biomejs.dev/reference/cli)
