# Skill Scanner Threats & Taxonomy

## Overview

Vendored Python module within the skill-scanner package that provides threat mapping, severity classification, and integration with the Cisco AI Security taxonomy. It consists of two main sub-modules: `threats.py` for configurable threat-to-severity/category mappings, and `cisco_ai_taxonomy.py` for loading, parsing, and querying the Cisco AI technology and sub-technology framework taxonomy.

## Responsibilities

- Define and manage threat severity levels and threat categories via configurable mappings (`ThreatMapping` class and related helpers)
- Load, merge, and reset custom threat mapping payloads to override defaults
- Parse and flatten the Cisco AI Security taxonomy from file, supporting framework mapping lookups by AI technology and sub-technology identifiers
- Validate AI technology and sub-technology codes against the loaded taxonomy
- Expose query functions for taxonomy source metadata, tech/sub-tech names, and framework mappings

## Source Coverage

- vendor/skill-scanner/skill_scanner/threats/__init__.py
- vendor/skill-scanner/skill_scanner/threats/cisco_ai_taxonomy.py
- vendor/skill-scanner/skill_scanner/threats/threats.py
