# Skill Scanner Rules & Extractors

## Overview

A vendored Python module (`vendor/skill-scanner`) that provides security scanning infrastructure for skill packages. It defines rule definitions, a YARA-based scanner, a rule registry with pack-loading support, content extractors, and a comprehensive suite of Python-based security check functions organized as a core rule pack. The checks cover allowed-tool violations, binary/hidden file detection, manifest validation, consistency analysis, trigger/keyword baiting, homoglyph attacks, and more.

## Responsibilities

- Define security rules via `SecurityRule` and load them with `RuleLoader` (patterns.py)
- Perform YARA-based content scanning via `YaraScanner`
- Manage rule definitions, packs, and loading through `RuleDefinition`, `RulePack`, `RuleRegistry`, and `PackLoader`
- Extract and normalize content from skill packages with `ContentExtractor`, enforcing `ExtractionLimits`
- Provide a core Python rule pack with domain-specific checks: allowed tools, analyzability, assets, binary files, bytecode, consistency, external tools (PDF/Office/homoglyph), file inventory, hidden files, manifest, and trigger/keyword baiting

## Source Coverage

- vendor/skill-scanner/skill_scanner/core/extractors/__init__.py
- vendor/skill-scanner/skill_scanner/core/extractors/content_extractor.py
- vendor/skill-scanner/skill_scanner/core/rule_registry.py
- vendor/skill-scanner/skill_scanner/core/rules/__init__.py
- vendor/skill-scanner/skill_scanner/core/rules/patterns.py
- vendor/skill-scanner/skill_scanner/core/rules/yara_scanner.py
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
