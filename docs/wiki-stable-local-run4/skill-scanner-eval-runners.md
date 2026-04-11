# Skill Scanner Eval Runners

## Overview

A vendored Python package containing benchmark and evaluation runners for the skill-scanner subsystem. These runners measure scanner accuracy against expected findings, enforce policy compliance, and provide tooling to update expected-findings baselines. Each runner is a standalone CLI-invocable script with its own `main()` entrypoint.

## Responsibilities

- Run skill-scanner benchmarks and compute precision/recall metrics (benchmark_runner.py)
- Execute evaluation comparisons between scanner runs and report results (eval_runner.py)
- Benchmark scanner output against security/quality policies and generate reports (policy_benchmark.py)
- Scan skills and suggest or update expected-findings baselines (update_expected_findings.py)

## Source Coverage

- vendor/skill-scanner/evals/runners/__init__.py
- vendor/skill-scanner/evals/runners/benchmark_runner.py
- vendor/skill-scanner/evals/runners/eval_runner.py
- vendor/skill-scanner/evals/runners/policy_benchmark.py
- vendor/skill-scanner/evals/runners/update_expected_findings.py
