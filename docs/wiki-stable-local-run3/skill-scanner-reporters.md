# Skill Scanner Reporters

## Overview

A vendored set of output formatters for the skill-scanner tool. Each reporter class transforms scan results into a specific output format: JSON, Markdown, HTML, SARIF (Static Analysis Results Interchange Format), or a plain-text table. Helper functions support pipeline-flow extraction for the Markdown reporter and HTML escaping for the HTML reporter.

## Responsibilities

- Format scan results as structured JSON output
- Render scan results as human-readable Markdown with pipeline flow extraction
- Generate self-contained HTML reports with proper escaping
- Produce SARIF-compliant output for integration with static-analysis tooling
- Display scan results as formatted text tables for terminal output

## Source Coverage

- vendor/skill-scanner/skill_scanner/core/reporters/__init__.py
- vendor/skill-scanner/skill_scanner/core/reporters/html_reporter.py
- vendor/skill-scanner/skill_scanner/core/reporters/json_reporter.py
- vendor/skill-scanner/skill_scanner/core/reporters/markdown_reporter.py
- vendor/skill-scanner/skill_scanner/core/reporters/sarif_reporter.py
- vendor/skill-scanner/skill_scanner/core/reporters/table_reporter.py
