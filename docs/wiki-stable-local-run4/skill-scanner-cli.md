# Skill Scanner CLI

## Overview

Vendored Python module providing the command-line interface, interactive wizard, policy configuration TUI, and Git pre-commit hook for the Skill Scanner tool. The module is organized into four main areas: the core CLI (`cli.py`) with argument parsing and scan commands, an interactive wizard (`wizard.py`) that walks users through scan configuration, a Textual-based policy TUI (`policy_tui.py`) for editing scan policies, and a pre-commit hook (`pre_commit.py`) that automatically scans staged skill files before commits.

## Responsibilities

- Parse CLI arguments and dispatch to scan, scan-all, list-analyzers, validate-rules, generate-policy, and configure-policy commands
- Load and resolve scan policies, build analyzer pipelines, and configure taxonomy/threat mappings
- Format and write scan output in multiple formats (e.g., JSON, text) with severity-based exit codes
- Provide an interactive wizard that detects the environment, guides path/analyzer/policy selection, and executes scans
- Offer a Textual-based TUI for interactively editing policy configuration files
- Implement a Git pre-commit hook that identifies staged skill files, scans them, and blocks commits based on severity thresholds
- Support hook installation into Git repositories

## Source Coverage

- vendor/skill-scanner/skill_scanner/cli/__init__.py
- vendor/skill-scanner/skill_scanner/cli/cli.py
- vendor/skill-scanner/skill_scanner/cli/policy_tui.py
- vendor/skill-scanner/skill_scanner/cli/wizard.py
- vendor/skill-scanner/skill_scanner/hooks/__init__.py
- vendor/skill-scanner/skill_scanner/hooks/pre_commit.py
