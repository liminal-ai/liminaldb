# Skill Scanner Utilities

## Overview

Vendored utility package providing shared file-handling and logging helpers for the skill-scanner tool. The module lives under `vendor/skill-scanner/skill_scanner/utils/` and exposes functions for safe file reading, file-type detection, binary-file checks, and configurable logger setup.

## Responsibilities

- Safely read files with error handling (`read_file_safe`)
- Determine file type from path or extension (`get_file_type`)
- Detect binary files to skip non-text content (`is_binary_file`)
- Configure and retrieve named loggers (`setup_logger`, `get_logger`)
- Toggle verbose/debug logging at runtime (`set_verbose_logging`)

## Source Coverage

- vendor/skill-scanner/skill_scanner/utils/__init__.py
- vendor/skill-scanner/skill_scanner/utils/file_utils.py
- vendor/skill-scanner/skill_scanner/utils/logging_config.py
- vendor/skill-scanner/skill_scanner/utils/logging_utils.py
