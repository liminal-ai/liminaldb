# Skill Scanner CLI

## Overview

The Skill Scanner CLI module is a vendored Python package providing the command-line interface, an interactive wizard, and a terminal UI (TUI) for policy configuration within the skill scanner tool. It is organized across three main files: `cli.py` (core CLI commands and argument parsing), `wizard.py` (step-by-step interactive scan configuration), and `policy_tui.py` (a Textual-based TUI for editing scan policies).

## Responsibilities

- Parse CLI arguments and dispatch to scan, scan-all, list-analyzers, validate-rules, generate-policy, and configure-policy subcommands
- Load and resolve scan policies, analyzers, taxonomy/threat mappings, and output formats
- Format and write scan results in multiple output formats
- Determine pass/fail exit codes based on finding severity thresholds
- Provide an interactive wizard that detects the environment, guides users through path selection, analyzer choice, policy, format, and severity options, then executes the scan
- Offer a Textual-based TUI (PolicyConfigApp) for visually editing policy configuration files, including a set editor screen for collection-valued fields

## Source Coverage

- vendor/skill-scanner/skill_scanner/cli/__init__.py
- vendor/skill-scanner/skill_scanner/cli/cli.py
- vendor/skill-scanner/skill_scanner/cli/policy_tui.py
- vendor/skill-scanner/skill_scanner/cli/wizard.py
