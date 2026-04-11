# Skill Scanner Utilities

## Overview

A vendored Python utility module providing shared helpers for the skill-scanner tool. It includes file I/O utilities, logging configuration, and a comprehensive suite of data pack rule checks used to analyze and validate skill packages (e.g., manifest validation, binary file detection, allowed-tools enforcement, trigger/keyword checks, and consistency verification).

## Responsibilities

- Safe file reading, file-type detection, and binary file identification (file_utils)
- Logger setup, retrieval, and verbose-mode toggling (logging_config, logging_utils)
- Finding ID generation and document-file classification helpers (_helpers)
- Allowed-tools violation checks: file read/write, bash execution, grep, glob, and network usage detection
- Analyzability assessment of skill packages
- Asset, binary, hidden, and archive file checks
- Manifest validation and file inventory checks
- Consistency checks between skill code behavior and manifest declarations (e.g., network usage)
- External tool checks including PDF, Office document, and homoglyph attack detection
- Trigger checks: generic pattern detection, description specificity, and keyword baiting analysis

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
- vendor/skill-scanner/skill_scanner/utils/__init__.py
- vendor/skill-scanner/skill_scanner/utils/file_utils.py
- vendor/skill-scanner/skill_scanner/utils/logging_config.py
- vendor/skill-scanner/skill_scanner/utils/logging_utils.py
