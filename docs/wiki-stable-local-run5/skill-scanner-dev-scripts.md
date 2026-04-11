# Skill Scanner Dev Scripts

## Overview

A collection of vendored Python development scripts supporting the skill-scanner tool. These scripts handle taxonomy validation, false-positive analysis data collection, automated reference documentation generation, and Homebrew formula maintenance. All four scripts are standalone CLI utilities located under `vendor/skill-scanner/scripts/` with no cross-module dependencies.

## Responsibilities

- Validate that skill taxonomy enum members are consistent with actual usage across the Python codebase (`check_taxonomy.py`)
- Collect skill detection results for false-positive analysis (`fp_analysis_collect.py`)
- Auto-generate CLI, API, and configuration reference documentation from source introspection (`generate_reference_docs.py`)
- Resolve PyPI dependencies and render an up-to-date Homebrew formula for the skill-scanner package (`update_brew_formula.py`)

## Source Coverage

- vendor/skill-scanner/scripts/check_taxonomy.py
- vendor/skill-scanner/scripts/fp_analysis_collect.py
- vendor/skill-scanner/scripts/generate_reference_docs.py
- vendor/skill-scanner/scripts/update_brew_formula.py
