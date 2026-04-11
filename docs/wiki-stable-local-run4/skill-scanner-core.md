# Skill Scanner Core

## Overview

Vendored Python scanning engine that loads, validates, and security-scans "skills" (packaged tool definitions). The module provides domain models (`Severity`, `Finding`, `ScanResult`, etc.), a configurable scan policy system with 14+ sub-policies, a rule registry with YARA and pattern-based rule support, file-magic detection for content-type verification, command-safety evaluation, and the top-level `SkillScanner` orchestrator that ties everything together. Located under `vendor/skill-scanner/skill_scanner/`.

## Responsibilities

- Define core domain models: Skill, SkillFile, SkillManifest, Finding, ScanResult, Report, Severity, ThreatCategory
- Load and parse skill packages from disk via SkillLoader
- Orchestrate security scans through SkillScanner, scan_skill(), and scan_directory()
- Enforce configurable scan policies (hidden files, credentials, file limits, command safety, LLM analysis, severity overrides, etc.)
- Manage rule definitions and packs via RuleRegistry and PackLoader
- Detect file types using magic bytes and Magika, flagging extension mismatches
- Evaluate shell command safety with risk classification (CommandRisk, CommandVerdict)
- Validate skill structure against strict schemas (SkillValidator, ValidationResult)
- Determine per-file analyzability and available analysis methods
- Build analyzer pipelines via analyzer_factory
- Provide a unified exception hierarchy (SkillScannerError and subclasses)
- Supply global configuration, constants, and YARA mode settings

## Source Coverage

- vendor/skill-scanner/skill_scanner/__init__.py
- vendor/skill-scanner/skill_scanner/config/__init__.py
- vendor/skill-scanner/skill_scanner/config/config.py
- vendor/skill-scanner/skill_scanner/config/constants.py
- vendor/skill-scanner/skill_scanner/config/yara_modes.py
- vendor/skill-scanner/skill_scanner/core/__init__.py
- vendor/skill-scanner/skill_scanner/core/analyzability.py
- vendor/skill-scanner/skill_scanner/core/analyzer_factory.py
- vendor/skill-scanner/skill_scanner/core/command_safety.py
- vendor/skill-scanner/skill_scanner/core/exceptions.py
- vendor/skill-scanner/skill_scanner/core/file_magic.py
- vendor/skill-scanner/skill_scanner/core/loader.py
- vendor/skill-scanner/skill_scanner/core/models.py
- vendor/skill-scanner/skill_scanner/core/rule_registry.py
- vendor/skill-scanner/skill_scanner/core/rules/__init__.py
- vendor/skill-scanner/skill_scanner/core/rules/patterns.py
- vendor/skill-scanner/skill_scanner/core/rules/yara_scanner.py
- vendor/skill-scanner/skill_scanner/core/scan_policy.py
- vendor/skill-scanner/skill_scanner/core/scanner.py
- vendor/skill-scanner/skill_scanner/core/strict_structure.py
