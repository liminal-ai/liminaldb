# Skill Scanner Threats & Taxonomy

## Overview

A vendored Python module within the `skill-scanner` package that provides threat mapping definitions, Cisco AI taxonomy lookups, and a comprehensive suite of rule-based security checks organized as data packs. It enables the skill scanner to classify findings by threat severity/category, map them to AI security frameworks, and run static analysis checks against Python-based skill packages.

## Responsibilities

- Define and manage threat mappings (severity, category) with support for custom overrides via `ThreatMapping` and `configure_threat_mappings`
- Load, parse, and query the Cisco AI taxonomy — validating AI tech/sub-tech identifiers and resolving framework mappings (e.g., MITRE ATLAS, OWASP)
- Provide rule-based security checks for Python skills: allowed-tool violations, analyzability, asset files, binary files, consistency, external tool risks (PDF, Office, homoglyphs), file inventory, hidden files, manifest validation, and trigger/keyword-baiting detection
- Supply helper utilities for generating deterministic finding IDs and identifying document files

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
- vendor/skill-scanner/skill_scanner/threats/__init__.py
- vendor/skill-scanner/skill_scanner/threats/cisco_ai_taxonomy.py
- vendor/skill-scanner/skill_scanner/threats/threats.py
