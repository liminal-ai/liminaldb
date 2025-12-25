# Bun Installation

> Source: https://bun.sh/docs/installation

## Overview

Bun ships as a single, dependency-free executable. You can install it via script, package manager, or Docker across macOS, Linux, and Windows.

After installation, verify with `bun --version` and `bun --revision`.

## Installation

### macOS & Linux

```bash
curl -fsSL https://bun.com/install | bash
```

**Linux users:** The `unzip` package is required. Use `sudo apt install unzip`. Kernel version 5.6+ is strongly recommended (minimum 5.1).

### Windows

```powershell
powershell -c "irm bun.sh/install.ps1|iex"
```

Requires Windows 10 version 1809 or later.

### Package Managers

```bash
npm install -g bun
# or
brew install oven-sh/bun/bun
```

### Docker

```bash
docker pull oven/bun
docker run --rm --init --ulimit memlock=-1:-1 oven/bun
```

## Verify Installation

```bash
bun --version
bun --revision
```

## Upgrading

```bash
bun upgrade
```

## Uninstall

### macOS & Linux
```bash
rm -rf ~/.bun
```

### Windows
```powershell
powershell -c ~\.bun\uninstall.ps1
```
