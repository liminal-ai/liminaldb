# Skill Scanner Core

## Overview

Vendored Python scanning engine that analyzes "skills" (packaged tool/agent bundles) for security threats, policy violations, and structural correctness. The module provides domain models, a loader for ingesting skill packages, a scanner orchestrator, a rich policy system, pattern/YARA-based rule engines, file-type detection, content extraction, and command safety evaluation.

## Responsibilities

- Define core domain models: Skill, SkillFile, SkillManifest, Finding, ScanResult, Report, Severity, and ThreatCategory
- Load and parse skill packages from disk via SkillLoader
- Orchestrate scanning workflows through SkillScanner with scan_skill and scan_directory entry points
- Enforce configurable scan policies (hidden files, credentials, file limits, command safety, LLM analysis, severity overrides, etc.) via composable policy classes aggregated by ScanPolicy
- Manage security rules through RuleRegistry, RuleDefinition, RulePack, and PackLoader
- Match files against pattern-based SecurityRule definitions and YARA rules via YaraScanner
- Detect file types using magic-byte analysis and extension-mismatch checking (file_magic)
- Extract and limit content from skill files via ContentExtractor
- Evaluate shell command safety with parse_command and evaluate_command
- Validate skill structure strictly via SkillValidator with typed ValidationErrorCode results
- Assess file analyzability and produce AnalyzabilityReport summaries
- Build analyzer pipelines through build_analyzers / build_core_analyzers factory functions
- Provide a unified exception hierarchy: SkillScannerError, SkillLoadError, SkillAnalysisError, SkillValidationError

## Source Coverage

- vendor/skill-scanner/skill_scanner/__init__.py
- vendor/skill-scanner/skill_scanner/core/__init__.py
- vendor/skill-scanner/skill_scanner/core/analyzability.py
- vendor/skill-scanner/skill_scanner/core/analyzer_factory.py
- vendor/skill-scanner/skill_scanner/core/command_safety.py
- vendor/skill-scanner/skill_scanner/core/exceptions.py
- vendor/skill-scanner/skill_scanner/core/extractors/__init__.py
- vendor/skill-scanner/skill_scanner/core/extractors/content_extractor.py
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
