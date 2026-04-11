# Skill Scanner Evals

## Overview

Vendored evaluation framework for the skill scanner. It provides benchmark runners that measure scanner accuracy (precision, recall, severity bucketing) against a curated corpus of intentionally malicious and safe skill fixtures. The module also includes a utility for updating expected-findings baselines as scanner rules evolve.

## Responsibilities

- Run end-to-end benchmarks of the skill scanner against known-malicious and known-safe fixture skills (`SkillBenchmarkRunner`, `EvaluationRunner`)
- Execute policy-specific benchmarks and generate human-readable reports (`run_policy_benchmark`, `generate_report`)
- Compare evaluation results across scanner versions or configurations (`run_comparison`)
- Update expected-findings baselines by re-scanning fixtures and suggesting deltas (`update_expected_findings`)
- Provide a diverse corpus of malicious skill fixtures covering backdoors, command injection, data exfiltration, obfuscation, path traversal, resource exhaustion, SQL injection, and multi-file behavioral exfiltration
- Provide safe skill fixtures (simple math, file validation, text formatting) to verify the scanner does not produce false positives

## Source Coverage

- vendor/skill-scanner/evals/__init__.py
- vendor/skill-scanner/evals/runners/__init__.py
- vendor/skill-scanner/evals/runners/benchmark_runner.py
- vendor/skill-scanner/evals/runners/eval_runner.py
- vendor/skill-scanner/evals/runners/policy_benchmark.py
- vendor/skill-scanner/evals/runners/update_expected_findings.py
- vendor/skill-scanner/evals/skills/backdoor/magic-string-trigger/process.py
- vendor/skill-scanner/evals/skills/behavioral-analysis/multi-file-exfiltration/analyze.py
- vendor/skill-scanner/evals/skills/behavioral-analysis/multi-file-exfiltration/collector.py
- vendor/skill-scanner/evals/skills/behavioral-analysis/multi-file-exfiltration/encoder.py
- vendor/skill-scanner/evals/skills/behavioral-analysis/multi-file-exfiltration/reporter.py
- vendor/skill-scanner/evals/skills/command-injection/eval-execution/calculate.py
- vendor/skill-scanner/evals/skills/data-exfiltration/environment-secrets/get_info.py
- vendor/skill-scanner/evals/skills/obfuscation/base64-payload/process.py
- vendor/skill-scanner/evals/skills/path-traversal/file-reader/read.py
- vendor/skill-scanner/evals/skills/resource-exhaustion/infinite-loop/analyze.py
- vendor/skill-scanner/evals/skills/safe-skills-2/file-validator/validate.py
- vendor/skill-scanner/evals/skills/safe-skills/simple-math/math_ops.py
- vendor/skill-scanner/evals/skills/sql-injection/database-query/query.py
- vendor/skill-scanner/evals/test_skills/malicious/exfiltrator/analyze.py
- vendor/skill-scanner/evals/test_skills/safe/simple-formatter/formatter.py
