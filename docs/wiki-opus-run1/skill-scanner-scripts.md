# Skill Scanner: Scripts

## Overview

A collection of four standalone Python maintenance and documentation scripts for the Skill Scanner vendor package. Each script is invoked independently via its `main()` entrypoint and serves a distinct purpose: validating the skill taxonomy enum against actual code usage, collecting false-positive analysis data, auto-generating CLI/API/configuration reference documentation, and keeping the Homebrew formula in sync with PyPI releases.

## Responsibilities

- Validate that every member of the skill taxonomy enum is used in source code and flag unused or undefined references (`check_taxonomy.py`)
- Scan skill detection results and collect data for false-positive analysis (`fp_analysis_collect.py`)
- Auto-generate Markdown reference docs for CLI help, API endpoints (with Pydantic models), and environment-variable configuration (`generate_reference_docs.py`)
- Resolve PyPI metadata and dependency trees to render and update the Homebrew formula for the Skill Scanner package (`update_brew_formula.py`)

## Source Coverage

- vendor/skill-scanner/scripts/check_taxonomy.py
- vendor/skill-scanner/scripts/fp_analysis_collect.py
- vendor/skill-scanner/scripts/generate_reference_docs.py
- vendor/skill-scanner/scripts/update_brew_formula.py
