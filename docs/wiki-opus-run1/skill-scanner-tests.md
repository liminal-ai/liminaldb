# Skill Scanner: Tests

## Overview

Comprehensive test suite for the skill-scanner vendor package, covering all analyzers (behavioral, static, LLM, meta, pipeline, bytecode, AI-defense, VirusTotal, cross-skill), the CLI interface, REST API endpoints, scan policies, rule registry, threat taxonomy, reporters, loaders, extractors, models, and detection quality. The suite is organized under `vendor/skill-scanner/tests/` with ~50 test files totaling over 17,000 LOC. Shared fixtures in `conftest.py` provide reusable skill directories, policy builders, and scanner factories.

## Responsibilities

- Validate all analyzer implementations (behavioral, static, LLM, meta, pipeline, bytecode, AI-defense, VirusTotal, cross-skill) produce correct findings
- Test CLI output formats (JSON, Markdown, Table, SARIF, Summary) and custom-rule/policy-preset flags
- Verify REST API endpoints for scanning, batch scanning, upload, health, and error handling
- Ensure scan policies (defaults, customization, presets, round-trip serialization) propagate correctly to analyzers
- Validate rule registry, rule packs, YARA rule loading, and coverage auditing
- Test threat taxonomy structure, completeness, customization, and cross-framework mappings
- Cover reporter output correctness for single-skill and multi-skill reports
- Verify loader behavior for skill discovery, manifest parsing, symlink rejection, and lenient mode
- Test extractor security (zip/tar symlink rejection, archive metadata)
- Validate file-magic detection, extension mismatch, and confidence thresholds
- Regression tests for specific bug fixes (ReDoS, path traversal, deterministic IDs, UTC timestamps, etc.)
- End-to-end and integration tests covering the full scan pipeline from CLI to report output
- Detection quality tests for YARA true-positives, false-positive regression, and new detection categories

## Source Coverage

- vendor/skill-scanner/tests/__init__.py
- vendor/skill-scanner/tests/behavioral/__init__.py
- vendor/skill-scanner/tests/behavioral/test_behavioral_analyzer.py
- vendor/skill-scanner/tests/behavioral/test_enhanced_behavioral.py
- vendor/skill-scanner/tests/conftest.py
- vendor/skill-scanner/tests/static_analysis/__init__.py
- vendor/skill-scanner/tests/static_analysis/test_static_analyzer.py
- vendor/skill-scanner/tests/test_aidefense_analyzer.py
- vendor/skill-scanner/tests/test_analyzability.py
- vendor/skill-scanner/tests/test_analyzer_factory.py
- vendor/skill-scanner/tests/test_api_deep.py
- vendor/skill-scanner/tests/test_api_endpoints.py
- vendor/skill-scanner/tests/test_api_server_config.py
- vendor/skill-scanner/tests/test_bash_taint_tracker.py
- vendor/skill-scanner/tests/test_bug_fixes.py
- vendor/skill-scanner/tests/test_bytecode_analyzer.py
- vendor/skill-scanner/tests/test_cli_custom_rules.py
- vendor/skill-scanner/tests/test_cli_formats.py
- vendor/skill-scanner/tests/test_cli_taxonomy_flags.py
- vendor/skill-scanner/tests/test_cli_tui_api_fixes.py
- vendor/skill-scanner/tests/test_command_safety.py
- vendor/skill-scanner/tests/test_compound_sequences.py
- vendor/skill-scanner/tests/test_config.py
- vendor/skill-scanner/tests/test_cross_skill_scanner.py
- vendor/skill-scanner/tests/test_e2e.py
- vendor/skill-scanner/tests/test_extractors.py
- vendor/skill-scanner/tests/test_file_magic.py
- vendor/skill-scanner/tests/test_hidden_files.py
- vendor/skill-scanner/tests/test_integration.py
- vendor/skill-scanner/tests/test_issue_fixes.py
- vendor/skill-scanner/tests/test_llm_analyzer.py
- vendor/skill-scanner/tests/test_llm_request_handler.py
- vendor/skill-scanner/tests/test_loader.py
- vendor/skill-scanner/tests/test_markdown_code_blocks.py
- vendor/skill-scanner/tests/test_meta_analyzer.py
- vendor/skill-scanner/tests/test_models.py
- vendor/skill-scanner/tests/test_new_detections.py
- vendor/skill-scanner/tests/test_pipeline_analyzer.py
- vendor/skill-scanner/tests/test_policy_integration.py
- vendor/skill-scanner/tests/test_policy_knobs.py
- vendor/skill-scanner/tests/test_reporters.py
- vendor/skill-scanner/tests/test_robustness_features.py
- vendor/skill-scanner/tests/test_rule_registry.py
- vendor/skill-scanner/tests/test_scan_policy.py
- vendor/skill-scanner/tests/test_scanner.py
- vendor/skill-scanner/tests/test_static_policy_integration.py
- vendor/skill-scanner/tests/test_strict_structure.py
- vendor/skill-scanner/tests/test_taxonomy_customization.py
- vendor/skill-scanner/tests/test_taxonomy_validation.py
- vendor/skill-scanner/tests/test_threats.py
- vendor/skill-scanner/tests/test_virustotal_analyzer.py
- vendor/skill-scanner/tests/test_virustotal_benign.py
- vendor/skill-scanner/tests/test_virustotal_upload.py
- vendor/skill-scanner/tests/test_yara_modes.py
- vendor/skill-scanner/tests/test_yara_true_positives.py
