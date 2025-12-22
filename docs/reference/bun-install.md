# bun install

> Source: https://bun.sh/docs/cli/install

## Basic Usage

```bash
bun install              # Install all dependencies
bun install react        # Install a package
bun install react@19.1.1 # Specific version
bun install react@latest # Latest tag
```

The `bun` CLI contains a Node.js-compatible package manager designed to be a dramatically faster replacement for `npm`, `yarn`, and `pnpm`.

## Key Features

- **25x faster** than npm install
- Supports `workspaces` in package.json
- Supports npm's `overrides` and Yarn's `resolutions`
- Lifecycle scripts with `trustedDependencies`

## Common Options

```bash
bun install --production     # Skip devDependencies
bun install --frozen-lockfile # Reproducible installs
bun install --dry-run        # Don't actually install
bun install -g cowsay        # Global install
```

## Lockfile

`bun.lock` is Bun's lockfile format. Prior to Bun 1.2, it was binary (`bun.lockb`).

## CI/CD

Use `bun ci` for reproducible builds:

```bash
bun ci  # Equivalent to bun install --frozen-lockfile
```

GitHub Actions example:

```yaml
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
      - run: bun ci
      - run: bun run build
```
