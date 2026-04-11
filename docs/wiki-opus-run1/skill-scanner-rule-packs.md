# Skill Scanner: Rule Packs

## Overview

The core Python rule pack for the Skill Scanner, providing a comprehensive set of static-analysis checks that evaluate skill packages for security, correctness, and policy compliance. Each check module focuses on a specific concern—manifest validity, hidden files, binary content, tool usage, triggers, consistency, and more—and produces structured findings with deterministic IDs.

## Responsibilities

- Validate skill manifest structure and required fields (manifest_checks)
- Detect hidden files that may indicate obfuscation or unintended content (hidden_file_checks)
- Flag binary and bytecode files embedded in skill packages (binary_file_checks, bytecode_checks)
- Check that code-level tool usage (file read/write, bash, network, grep, glob) aligns with declared allowed tools (allowed_tools_checks)
- Verify consistency between manifest declarations and actual skill behavior, e.g. network usage (consistency_checks)
- Analyze trigger descriptions for generic patterns, keyword baiting, and specificity issues (trigger_checks)
- Inspect asset files for policy compliance (asset_checks)
- Inventory all files in a skill package (file_inventory_checks)
- Detect PDF/Office documents and homoglyph attacks in external content (external_tool_checks)
- Assess overall analyzability of skill source code (analyzability_checks)
- Provide shared helpers for finding ID generation and document-file detection (_helpers)

## Source Coverage

- vendor/skill-scanner/skill_scanner/data/__init__.py
- vendor/skill-scanner/skill_scanner/data/packs/__init__.py
- vendor/skill-scanner/skill_scanner/data/packs/core/__init__.py
- vendor/skill-scanner/skill_scanner/data/packs/core/python/__init__.py
- vendor/skill-scanner/skill_scanner/data/packs/core/python/_helpers.py
- vendor/skill-scanner/skill_scanner/data/packs/core/python/allowed_tools_checks.py
- vendor/skill-scanner/skill_scanner/data/packs/core/python/analyzability_checks.py
- vendor/skill-scanner/skill_scanner/data/packs/core/python/archive_checks.py
- vendor/skill-scanner/skill_scanner/data/packs/core/python/asset_checks.py
- vendor/skill-scanner/skill_scanner/data/packs/core/python/binary_file_checks.py
- vendor/skill-scanner/skill_scanner/data/packs/core/python/bytecode_checks.py
- vendor/skill-scanner/skill_scanner/data/packs/core/python/consistency_checks.py
- vendor/skill-scanner/skill_scanner/data/packs/core/python/external_tool_checks.py
- vendor/skill-scanner/skill_scanner/data/packs/core/python/file_inventory_checks.py
- vendor/skill-scanner/skill_scanner/data/packs/core/python/hidden_file_checks.py
- vendor/skill-scanner/skill_scanner/data/packs/core/python/manifest_checks.py
- vendor/skill-scanner/skill_scanner/data/packs/core/python/trigger_checks.py
