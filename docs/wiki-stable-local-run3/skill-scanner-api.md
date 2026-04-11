# Skill Scanner API

## Overview

A vendored REST API module built with FastAPI that exposes endpoints for scanning and analyzing skills. The module provides a CLI entry point, server configuration, and a comprehensive router with endpoints for single scans, batch scans, file uploads, health checks, and analyzer listing. A bounded cache supports result retrieval for asynchronous batch operations.

## Responsibilities

- Expose REST endpoints for skill scanning (single, batch, and file-upload modes)
- Provide a CLI entry point (`main`) for launching the API server
- Configure and run the FastAPI/Uvicorn server via `run_server`
- Validate input paths and resolve analysis policies before scanning
- Build analyzer pipelines and recompute report summaries from scan results
- Cache batch scan results with a bounded in-memory cache (`_BoundedCache`)
- Serve health-check and analyzer-listing informational endpoints

## Source Coverage

- vendor/skill-scanner/skill_scanner/api/__init__.py
- vendor/skill-scanner/skill_scanner/api/api.py
- vendor/skill-scanner/skill_scanner/api/api_cli.py
- vendor/skill-scanner/skill_scanner/api/api_server.py
- vendor/skill-scanner/skill_scanner/api/router.py
