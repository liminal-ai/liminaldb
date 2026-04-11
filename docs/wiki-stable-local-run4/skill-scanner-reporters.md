# Skill Scanner Reporters

## Overview

A vendored set of output formatters for the skill-scanner tool. Each reporter class converts scan results into a specific format: JSON, Markdown, HTML, SARIF (Static Analysis Results Interchange Format), or a plain-text table. The module lives under `vendor/skill-scanner/skill_scanner/core/reporters/`.

## Responsibilities

- Format scan results as structured JSON output (JSONReporter)
- Render scan results as human-readable Markdown with pipeline flow extraction (MarkdownReporter)
- Generate self-contained HTML reports with proper escaping (HTMLReporter)
- Produce SARIF-compliant output for integration with static-analysis tooling (SARIFReporter)
- Display scan results in a plain-text table layout for terminal use (TableReporter)

## Source Coverage

- vendor/skill-scanner/skill_scanner/core/reporters/__init__.py
- vendor/skill-scanner/skill_scanner/core/reporters/html_reporter.py
- vendor/skill-scanner/skill_scanner/core/reporters/json_reporter.py
- vendor/skill-scanner/skill_scanner/core/reporters/markdown_reporter.py
- vendor/skill-scanner/skill_scanner/core/reporters/sarif_reporter.py
- vendor/skill-scanner/skill_scanner/core/reporters/table_reporter.py
