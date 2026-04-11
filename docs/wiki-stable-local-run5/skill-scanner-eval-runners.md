# Skill Scanner Eval Runners

## Overview

A vendored Python package providing benchmark and evaluation runners for the skill-scanner tool. These runners measure scanner accuracy against expected findings, run policy-based benchmarks, compare evaluation results, and provide utilities for updating expected findings baselines. Each runner is independently executable via its own `main` entrypoint.

## Responsibilities

- Run skill-level benchmarks and compute precision/recall metrics (benchmark_runner.py)
- Execute evaluations comparing scanner output against expected findings and print metrics (eval_runner.py)
- Run policy-based benchmarks across eval sets and skill corpora, generating summary reports (policy_benchmark.py)
- Scan skills, suggest updated expected findings, and write them back to baseline files (update_expected_findings.py)

## Source Coverage

- vendor/skill-scanner/evals/runners/__init__.py
- vendor/skill-scanner/evals/runners/benchmark_runner.py
- vendor/skill-scanner/evals/runners/eval_runner.py
- vendor/skill-scanner/evals/runners/policy_benchmark.py
- vendor/skill-scanner/evals/runners/update_expected_findings.py
