# Skill Scanner Scripts

## Overview

A collection of vendored Python maintenance scripts for the skill-scanner tool. These scripts handle taxonomy validation, false-positive analysis data collection, automated reference documentation generation, and Homebrew formula updates. Each script is a standalone CLI utility invoked via its `main()` entrypoint.

## Responsibilities

- Validate that skill taxonomy enum members are consistent with actual usage across Python source files (check_taxonomy.py)
- Collect and analyze false-positive skill detection results for quality assessment (fp_analysis_collect.py)
- Auto-generate CLI, API, and configuration reference documentation from source introspection including Pydantic models and endpoint extraction (generate_reference_docs.py)
- Produce and update Homebrew formula files by resolving PyPI dependencies and rendering resource blocks (update_brew_formula.py)

## Source Coverage

- vendor/skill-scanner/scripts/check_taxonomy.py
- vendor/skill-scanner/scripts/fp_analysis_collect.py
- vendor/skill-scanner/scripts/generate_reference_docs.py
- vendor/skill-scanner/scripts/update_brew_formula.py
