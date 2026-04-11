# Skill Scanner CLI & API

## Overview

Vendored Python module providing multiple interfaces for the skill-scanner analysis tool: a full-featured CLI with subcommands (scan, scan-all, list-analyzers, validate-rules, generate-policy, configure-policy), an interactive wizard for guided scan configuration, a Textual-based TUI for policy editing, a FastAPI REST server for programmatic scanning, and Git pre-commit hooks that gate commits on scan severity thresholds.

## Responsibilities

- Parse CLI arguments and dispatch to scan, scan-all, list-analyzers, validate-rules, generate-policy, and configure-policy subcommands
- Run an interactive wizard that detects the environment, walks the user through path/analyzer/policy/format selection, and executes scans
- Provide a Textual TUI (PolicyConfigApp, SetEditorScreen) for visually editing scan policies
- Expose a REST API (FastAPI router) with endpoints for health checks, single-skill scans, uploaded-skill scans, batch scans, and analyzer listing
- Implement pre-commit hook logic: detect staged files, resolve affected skills, scan them, and block commits when findings meet or exceed a severity threshold
- Format and write scan output in multiple formats (JSON, text, etc.) and generate single- and multi-skill summaries
- Load, resolve, and validate scan policies across CLI, API, and hook entry points
- Build and configure analyzer pipelines and meta-analyzers from CLI flags or API request parameters

## Source Coverage

- vendor/skill-scanner/skill_scanner/api/__init__.py
- vendor/skill-scanner/skill_scanner/api/api.py
- vendor/skill-scanner/skill_scanner/api/api_cli.py
- vendor/skill-scanner/skill_scanner/api/api_server.py
- vendor/skill-scanner/skill_scanner/api/router.py
- vendor/skill-scanner/skill_scanner/cli/__init__.py
- vendor/skill-scanner/skill_scanner/cli/cli.py
- vendor/skill-scanner/skill_scanner/cli/policy_tui.py
- vendor/skill-scanner/skill_scanner/cli/wizard.py
- vendor/skill-scanner/skill_scanner/hooks/__init__.py
- vendor/skill-scanner/skill_scanner/hooks/pre_commit.py
