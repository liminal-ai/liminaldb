# Skill Scanner: Utilities

## Overview

Shared utility modules for the Skill Scanner tool, providing safe file reading, file-type detection, and configurable logging. The package contains two concerns—file handling (`file_utils`) and logging (`logging_config` / `logging_utils`)—exposed through a flat `utils` package.

## Responsibilities

- Safely read files with encoding error handling (`read_file_safe`)
- Determine file type from extension or content (`get_file_type`)
- Detect binary files to avoid processing non-text content (`is_binary_file`)
- Set up and retrieve named loggers with consistent formatting (`setup_logger`, `get_logger`)
- Toggle verbose (debug-level) logging at runtime (`set_verbose_logging`)

## Source Coverage

- vendor/skill-scanner/skill_scanner/utils/__init__.py
- vendor/skill-scanner/skill_scanner/utils/file_utils.py
- vendor/skill-scanner/skill_scanner/utils/logging_config.py
- vendor/skill-scanner/skill_scanner/utils/logging_utils.py
