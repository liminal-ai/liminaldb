# Skill Scanner Tests

## Overview

Comprehensive Python test suite for the vendored skill-scanner security tool. Spanning ~50 test files and over 15,000 lines of code, the suite validates every layer of the scanner — from individual analyzers (behavioral, static, LLM, AI-defense, bytecode, pipeline, meta, VirusTotal, cross-skill) through policy configuration, threat taxonomy, detection rules, CLI output formats, API endpoints, reporters, models, extractors, and end-to-end workflows. Shared pytest fixtures in `conftest.py` provide reusable skill directories, policy builders, and scanner factories used across the test modules.

## Responsibilities

- Validate analyzer correctness: behavioral, enhanced-behavioral, static, LLM, AI-defense, bytecode, pipeline, meta, cross-skill, and VirusTotal analyzers each have dedicated test modules verifying initialization, detection accuracy, policy integration, and error handling.
- Ensure detection quality: true-positive and false-positive regression tests for YARA rules, signature checks, compound attack sequences, markdown code-block extraction, bash taint tracking, command safety evaluation, homoglyph detection, and file-magic identification.
- Test policy and configuration: scan policy defaults, customization, presets, round-trip serialization, policy knobs (file limits, credentials, hidden files, rule scoping, severity overrides, analyzer toggles), and policy-driven sensitivity across analyzers.
- Cover CLI and output formats: JSON, Markdown, table, SARIF, and summary output formats; custom rule loading; taxonomy CLI flags; lenient mode; fail-on-severity gating; and help-text validation.
- Verify API surface: health, root, scan, batch-scan, upload, and analyzers endpoints; policy propagation; response schema compliance; concurrent request handling; malformed-upload rejection; symlink-upload rejection; and server configuration consistency.
- Test models and reporters: Finding, ScanResult, and Report model invariants; JSON/Markdown/table/SARIF reporter output correctness; multi-skill summaries; and file-save fidelity.
- Guard robustness and bug-fix regressions: deterministic finding IDs, symlink traversal prevention, ReDoS protection, UTC timestamps, bounded-cache thread safety, coroutine-sync fixes, operator-precedence fixes, and narrow exception catches.
- Validate rule registry and taxonomy: rule definition structure, pack coverage audits, enabled-knob functionality, taxonomy validation/completeness, threat-mapping structure, custom taxonomy overrides, and LLM schema enum tracking.
- Provide shared test infrastructure via conftest.py: `make_skill`, `make_policy`, `make_scanner`, `safe_skill_dir`, `malicious_skill_dir`, and `prompt_injection_skill_dir` fixtures.

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
