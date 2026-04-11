# Skill Scanner Core

## Overview

Vendored Python scanning engine that loads, validates, and analyzes "skills" (packaged tool definitions) for security threats. The module provides domain models (severity, findings, scan results), a skill loader, a scanner orchestrator, configurable scan policies, file-magic detection, command-safety evaluation, structure validation, and analyzability scoring. Configuration is managed through a `Config` class, constants, and YARA mode settings.

## Responsibilities

- Define core domain models: Severity, ThreatCategory, Skill, SkillFile, SkillManifest, Finding, ScanResult, Report
- Load and parse skill packages from disk via SkillLoader / load_skill
- Orchestrate scanning pipelines through SkillScanner, scan_skill, and scan_directory
- Enforce configurable scan policies (hidden files, credentials, file limits, command safety, LLM analysis, severity overrides, etc.)
- Detect file types via magic-byte analysis and flag extension mismatches
- Evaluate shell command safety with risk classification
- Validate skill structure against strict rules (SkillValidator, ValidationErrorCode)
- Compute per-file analyzability scores and reports
- Build analyzer pipelines via analyzer_factory (build_analyzers, build_core_analyzers)
- Provide typed exception hierarchy: SkillScannerError, SkillLoadError, SkillAnalysisError, SkillValidationError
- Expose global configuration (Config), constants (SkillScannerConstants), and YARA mode settings (YaraMode, YaraModeConfig)

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
- vendor/skill-scanner/skill_scanner/core/scan_policy.py
- vendor/skill-scanner/skill_scanner/core/scanner.py
- vendor/skill-scanner/skill_scanner/core/strict_structure.py
