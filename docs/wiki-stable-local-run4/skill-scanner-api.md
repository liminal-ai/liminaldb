# Skill Scanner API

## Overview

A vendored FastAPI-based REST API server that exposes skill-scanning capabilities over HTTP. The module provides endpoints for scanning individual skills, uploading skills for analysis, running batch scans, listing available analyzers, and health checks. It includes a CLI entry point for launching the server and supporting infrastructure like request/response models, policy resolution, and a bounded in-memory cache for batch results.

## Responsibilities

- Expose REST endpoints for single and batch skill scanning (`scan_skill`, `scan_uploaded_skill`, `scan_batch`, `get_batch_scan_result`)
- Provide health and root info endpoints (`health_check`, `root`)
- List available analyzers via the `list_analyzers` endpoint
- Resolve scan policies and build analyzer pipelines (`_resolve_policy`, `_build_analyzers`)
- Validate file paths and recompute report summaries (`_validate_path`, `_recompute_report_summary`)
- Cache batch scan results with a bounded in-memory cache (`_BoundedCache`)
- Run the API server via uvicorn (`run_server`)
- Provide a CLI entry point for server configuration and startup (`main`)

## Source Coverage

- vendor/skill-scanner/skill_scanner/api/__init__.py
- vendor/skill-scanner/skill_scanner/api/api.py
- vendor/skill-scanner/skill_scanner/api/api_cli.py
- vendor/skill-scanner/skill_scanner/api/api_server.py
- vendor/skill-scanner/skill_scanner/api/router.py
