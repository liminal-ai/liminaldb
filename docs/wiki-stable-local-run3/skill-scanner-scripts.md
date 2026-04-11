# Skill Scanner Scripts

## Overview

A collection of vendored Python maintenance scripts for the skill-scanner project. These scripts handle taxonomy validation, false-positive analysis data collection, automated reference documentation generation, and Homebrew formula updates. Each script is a standalone CLI tool with its own `main()` entrypoint and no cross-dependencies to the rest of the LiminalDB codebase.

## Responsibilities

- Validate that skill taxonomy enum members are consistent with actual usage across the Python codebase (`check_taxonomy.py`)
- Collect and analyze false-positive skill detection results for quality assessment (`fp_analysis_collect.py`)
- Auto-generate CLI, API, and configuration reference documentation from source introspection (`generate_reference_docs.py`)
- Resolve PyPI dependencies and render an updated Homebrew formula for the skill-scanner package (`update_brew_formula.py`)

## Source Coverage

- vendor/skill-scanner/scripts/check_taxonomy.py
- vendor/skill-scanner/scripts/fp_analysis_collect.py
- vendor/skill-scanner/scripts/generate_reference_docs.py
- vendor/skill-scanner/scripts/update_brew_formula.py
