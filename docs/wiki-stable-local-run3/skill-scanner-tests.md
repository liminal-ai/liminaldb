# Skill Scanner Tests

## Overview

Comprehensive Python test suite for the vendored skill-scanner security analysis tool. Spanning ~50 test files and approximately 17,000 lines of code, the suite validates every layer of the scanner: individual analyzers (behavioral, static, LLM, bytecode, pipeline, meta, AI-defense, VirusTotal, cross-skill), the scanning engine and models, scan policies and policy knobs, CLI output formats and flags, the REST API surface, report generation, threat taxonomy, rule registry, file extraction, and end-to-end workflows. Shared pytest fixtures in `conftest.py` provide reusable skill directories, policy builders, and scanner factories used across test modules.

## Responsibilities

- Validate each analyzer (behavioral, enhanced-behavioral, static, LLM, bytecode, pipeline, meta, AI-defense, VirusTotal, cross-skill) produces correct findings for safe, malicious, and edge-case skills
- Test scan policy defaults, customization, presets, round-trip serialization, and per-knob behavior (file limits, command safety, credentials, hidden files, rule scoping, etc.)
- Verify CLI output formats (JSON, Markdown, table, SARIF, summary) and CLI flags (taxonomy, custom rules, lenient mode, fail-on-severity)
- Cover REST API endpoints (health, scan, batch-scan, upload, analyzers) including error handling, policy propagation, concurrent requests, and server configuration
- Test data models (Finding, ScanResult, Report), reporters, and serialization correctness
- Ensure detection quality via YARA true-positive/false-positive regression tests, signature checks, and compound sequence detection
- Validate threat taxonomy structure, completeness, customization, and cross-framework mappings
- Test robustness features: lenient loading, skipped skills, pre-commit hooks, fail-severity resolution
- Guard against regressions with dedicated bug-fix and issue-fix test suites covering symlink traversal, ReDoS protection, deterministic IDs, cache thread safety, and more
- Provide shared fixtures (safe_skill_dir, malicious_skill_dir, make_skill, make_policy, make_scanner) for consistent test setup

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
