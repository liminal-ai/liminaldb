# Fly.io Secrets

> Source: https://fly.io/docs/reference/secrets/

## Overview

Secrets allow sensitive values to be passed securely to your Fly App. The secret is encrypted and stored in a vault, available as environment variables at runtime.

## Architecture

- Secrets stored in encrypted vault
- API servers can only encrypt, never decrypt
- Secret values are never logged
- Temporary auth token used at boot to decrypt and inject as env vars

## Set Secrets

```bash
fly secrets set DATABASE_URL=postgres://example.com/mydb
```

Stage a secret (defer Machine restart):
```bash
fly secrets set DATABASE_URL=postgres://example.com/mydb --stage
```

Deploy staged secrets:
```bash
fly secrets deploy
```

## List Secrets

```bash
fly secrets list
```

Output shows name and digest only, not values.

## Remove Secrets

```bash
fly secrets unset MY_SECRET DATABASE_URL
```

## Mounting Secrets as Files

Base64 encode the secret:
```bash
fly secrets set SUPER_SECRET=$(cat filename.txt | base64)
```

Mount in `fly.toml`:
```toml
[[files]]
  guest_path = "/path/to/secret.txt"
  secret_name = "SUPER_SECRET"
```

## Security Warning

`flyctl` and API servers prevent secret extraction. However, secrets are available to application code as environment variables. People with deploy access can deploy code that reads and exposes secret values.
