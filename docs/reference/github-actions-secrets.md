# GitHub Actions Secrets

> Source: https://docs.github.com/en/actions/security-guides/using-secrets-in-github-actions

## Creating Repository Secrets

1. Navigate to repository Settings
2. In "Security" section, select **Secrets and variables** > **Actions**
3. Click **Secrets** tab
4. Click **New repository secret**
5. Enter Name and Value
6. Click **Add secret**

### CLI Method

```bash
gh secret set SECRET_NAME
# or from file
gh secret set SECRET_NAME < secret.txt

# list secrets
gh secret list
```

## Creating Environment Secrets

1. Navigate to repository Settings
2. Click **Environments**
3. Select environment
4. Under **Environment secrets**, click **Add secret**

### CLI Method

```bash
gh secret set --env ENV_NAME SECRET_NAME
gh secret list --env ENV_NAME
```

## Creating Organization Secrets

1. Navigate to organization Settings
2. In "Security" section, select **Secrets and variables** > **Actions**
3. Click **New organization secret**
4. Configure repository access policy

### CLI Method

```bash
gh auth login --scopes "admin:org"
gh secret set --org ORG_NAME SECRET_NAME
gh secret set --org ORG_NAME SECRET_NAME --visibility all
gh secret set --org ORG_NAME SECRET_NAME --repos REPO-NAME-1,REPO-NAME-2
```

## Using Secrets in Workflows

```yaml
steps:
  - name: Hello world action
    with:
      super_secret: ${{ secrets.SuperSecret }}
    env:
      super_secret: ${{ secrets.SuperSecret }}
```

### Bash Example

```yaml
steps:
  - shell: bash
    env:
      SUPER_SECRET: ${{ secrets.SuperSecret }}
    run: |
      example-command "$SUPER_SECRET"
```

## Notes

- Secrets are not passed to workflows from forked repositories
- Secrets are not automatically passed to reusable workflows
- Mask sensitive info with `::add-mask::VALUE`
- Secrets cannot be directly referenced in `if:` conditionals
