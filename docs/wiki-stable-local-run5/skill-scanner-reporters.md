# Skill Scanner Reporters

## Overview

A vendored set of output formatters for the skill-scanner tool. Each reporter class converts scan results into a specific format: JSON, Markdown, HTML, SARIF (Static Analysis Results Interchange Format), or a plain-text table. The module lives under `vendor/skill-scanner/skill_scanner/core/reporters/`.

## Responsibilities

- Format scan results as JSON output via JSONReporter
- Render scan results as Markdown documents, including pipeline flow extraction, via MarkdownReporter
- Generate self-contained HTML reports with HTML-escaping via HTMLReporter
- Produce SARIF-compliant output for integration with static analysis tooling via SARIFReporter
- Output human-readable tabular summaries via TableReporter

## Source Coverage

- vendor/skill-scanner/skill_scanner/core/reporters/__init__.py
- vendor/skill-scanner/skill_scanner/core/reporters/html_reporter.py
- vendor/skill-scanner/skill_scanner/core/reporters/json_reporter.py
- vendor/skill-scanner/skill_scanner/core/reporters/markdown_reporter.py
- vendor/skill-scanner/skill_scanner/core/reporters/sarif_reporter.py
- vendor/skill-scanner/skill_scanner/core/reporters/table_reporter.py
