# Skill Scanner Eval Skills

## Overview

A vendored collection of sample Python skills used as evaluation fixtures for the skill-scanner security analyzer. The module provides both **malicious** skills (covering common attack categories) and **safe** skills (benign utilities), enabling the scanner to be tested for true-positive and false-positive detection rates across a broad threat taxonomy.

## Responsibilities

- Provide malicious skill fixtures spanning backdoor triggers, command injection, data exfiltration, obfuscation, path traversal, resource exhaustion, SQL injection, and multi-file behavioral exfiltration patterns
- Provide safe skill fixtures (simple math, file validation, text formatting) to verify the scanner does not flag benign code
- Organize skills into a discoverable directory hierarchy by threat category for automated eval harnesses

## Source Coverage

- vendor/skill-scanner/evals/__init__.py
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
