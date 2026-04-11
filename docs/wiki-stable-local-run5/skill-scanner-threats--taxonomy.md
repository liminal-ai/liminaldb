# Skill Scanner Threats & Taxonomy

## Overview

A vendored Python sub-package within the skill-scanner library that provides threat mapping, severity classification, and Cisco AI taxonomy integration. The module is split into two main files: `threats.py` for configurable threat-to-severity/category mappings, and `cisco_ai_taxonomy.py` for loading and querying the Cisco AI technology taxonomy with framework cross-references.

## Responsibilities

- Define and manage threat-to-severity and threat-to-category mappings via the `ThreatMapping` class and related configuration functions
- Support custom threat mapping payloads that can be loaded, merged, and applied on top of defaults
- Load, parse, and normalize the Cisco AI taxonomy from file, exposing lookup functions for AI tech/subtech names and validity checks
- Provide framework mapping retrieval for AI technologies and sub-technologies (e.g., MITRE ATLAS, OWASP)
- Allow runtime reloading of taxonomy data and querying of the active taxonomy source

## Source Coverage

- vendor/skill-scanner/skill_scanner/threats/__init__.py
- vendor/skill-scanner/skill_scanner/threats/cisco_ai_taxonomy.py
- vendor/skill-scanner/skill_scanner/threats/threats.py
