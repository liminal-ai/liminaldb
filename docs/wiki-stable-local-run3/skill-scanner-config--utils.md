# Skill Scanner Config & Utils

## Overview

Vendored Python module providing configuration management, constants, YARA scanning mode definitions, file utilities, structured logging, and Git pre-commit hook integration for the skill-scanner tool. This module supplies the foundational settings and helper functions consumed by the scanner's core analysis engine.

## Responsibilities

- Centralize scanner configuration via the `Config` class
- Define scanning constants through `SkillScannerConstants`
- Model YARA scanning modes and their sub-configs (`YaraMode`, `YaraModeConfig`, `UnicodeStegConfig`, `CredentialHarvestingConfig`, `ToolChainingConfig`)
- Provide safe file reading, type detection, and binary-file checks (`file_utils`)
- Configure and manage loggers with optional verbose mode (`logging_config`, `logging_utils`)
- Implement a Git pre-commit hook that loads config, identifies staged skill files, scans them, checks severity thresholds, and formats findings

## Source Coverage

- vendor/skill-scanner/skill_scanner/config/__init__.py
- vendor/skill-scanner/skill_scanner/config/config.py
- vendor/skill-scanner/skill_scanner/config/constants.py
- vendor/skill-scanner/skill_scanner/config/yara_modes.py
- vendor/skill-scanner/skill_scanner/hooks/__init__.py
- vendor/skill-scanner/skill_scanner/hooks/pre_commit.py
- vendor/skill-scanner/skill_scanner/utils/__init__.py
- vendor/skill-scanner/skill_scanner/utils/file_utils.py
- vendor/skill-scanner/skill_scanner/utils/logging_config.py
- vendor/skill-scanner/skill_scanner/utils/logging_utils.py
