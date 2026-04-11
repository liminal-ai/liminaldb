# Skill Scanner Tests

## Overview

Comprehensive Python test suite for the vendored skill-scanner security analysis tool. Spanning ~50 test files and approximately 17,000 lines of code, the suite validates every major subsystem: analyzers (behavioral, static, LLM, meta, pipeline, bytecode, AI-defense, VirusTotal, cross-skill), the CLI and TUI interfaces, the REST API, scan policies and policy knobs, report formatters (JSON, Markdown, Table, SARIF), threat taxonomy mappings, YARA rule detection, file extraction/magic, loader robustness, and end-to-end scanning workflows. Shared pytest fixtures in `conftest.py` provide reusable skill directories, policy builders, and scanner factories.

## Responsibilities

- Validate behavioral, static, LLM, meta, pipeline, bytecode, AI-defense, VirusTotal, and cross-skill analyzers produce correct findings
- Test CLI output formats (JSON, Markdown, Table, SARIF, Summary) and custom rule/taxonomy flag handling
- Verify REST API endpoints including scan, batch-scan, upload, health, policy propagation, and error handling
- Ensure scan policies (defaults, presets, knobs, YAML round-trip, severity overrides, disabled rules) function correctly
- Confirm reporter output correctness and multi-skill summary generation
- Cover data models (Finding, ScanResult, Report) for serialization and field integrity
- Test security-critical detection: prompt injection, credential harvesting, code execution, symlink traversal, homoglyphs, embedded binaries
- Regression tests for specific bug fixes (ReDoS, coroutine sync, operator precedence, path traversal, cache thread safety)
- YARA rule true-positive and false-positive regression testing
- End-to-end and integration tests exercising the full scan pipeline from loader through reporter
- Robustness features: lenient loading, fail-on-severity thresholds, pre-commit hooks, multi-skill skipped-skill reporting

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
