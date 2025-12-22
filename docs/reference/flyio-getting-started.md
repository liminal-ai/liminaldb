# Fly.io Getting Started

> Source: https://fly.io/docs/getting-started/

## Quick Links

- **[Quickstart](https://fly.io/docs/getting-started/launch/):** Launch your own app now
- **[Launch hellofly demo](https://fly.io/docs/getting-started/launch-demo):** Install flyctl and create an account
- **[Choose your framework](https://fly.io/docs/getting-started/get-started-by-framework/):** Get started with your preferred tech

## Install flyctl

### macOS
```bash
brew install flyctl
```

### Linux
```bash
curl -L https://fly.io/install.sh | sh
```

### Windows
```powershell
pwsh -Command "iwr https://fly.io/install.ps1 -useb | iex"
```

## Authenticate

```bash
fly auth login
```

## Create an App

```bash
fly apps create <app-name>
```

## Deploy

```bash
fly deploy
```

## Learn More

- [Fly Launch](https://fly.io/docs/apps): Manage and run your apps
- [Going to production](https://fly.io/docs/apps/going-to-production/): Production environment checklist
- [Databases & Storage](https://fly.io/docs/database-storage-guides/): Persistent data options
- [Fly Machines](https://fly.io/docs/machines/): Fast-launching VMs
- [Networking](https://fly.io/docs/networking): Custom domains, private networking
