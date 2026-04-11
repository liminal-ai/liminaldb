# Skill Scanner Analyzers

## Overview

A vendored Python module providing a family of security analyzers for scanning skills (code artifacts). Each analyzer targets a different facet of security—from static pattern matching and bytecode inspection to LLM-powered semantic analysis, behavioral alignment checks, pipeline taint tracking, and external threat-intelligence integrations (VirusTotal, AI Defense). A `MetaAnalyzer` aggregates and reconciles findings across all analyzers.

## Responsibilities

- Define the `BaseAnalyzer` contract that all analyzers implement
- Perform static code analysis via pattern and AST inspection (`StaticAnalyzer`, ~2.2k LOC)
- Analyze runtime behavioral alignment using an LLM-backed orchestration pipeline (`BehavioralAnalyzer`, `AlignmentOrchestrator`, `AlignmentLLMClient`, `AlignmentPromptBuilder`, `AlignmentResponseValidator`, `ThreatVulnerabilityClassifier`)
- Provide LLM-based security review with multi-provider support (`LLMAnalyzer`, `LLMProvider`, `ProviderConfig`, `LLMRequestHandler`, `PromptBuilder`, `ResponseParser`)
- Inspect Python bytecode for suspicious operations (`BytecodeAnalyzer`)
- Detect dangerous shell pipeline and command-injection patterns via taint analysis (`PipelineAnalyzer`, `TaintType`, `CommandNode`, `PipelineChain`)
- Identify time-based or event-based trigger mechanisms (`TriggerAnalyzer`)
- Scan across multiple skills for coordinated threats (`CrossSkillScanner`)
- Aggregate, correlate, and weight findings from all analyzers (`MetaAnalyzer`, `MetaAnalysisResult`, `apply_meta_analysis_to_results`)
- Integrate with VirusTotal for external malware intelligence (`VirusTotalAnalyzer`)
- Integrate with AI Defense services for adversarial-input detection (`AIDefenseAnalyzer`)

## Source Coverage

- vendor/skill-scanner/skill_scanner/core/analyzers/__init__.py
- vendor/skill-scanner/skill_scanner/core/analyzers/aidefense_analyzer.py
- vendor/skill-scanner/skill_scanner/core/analyzers/base.py
- vendor/skill-scanner/skill_scanner/core/analyzers/behavioral/__init__.py
- vendor/skill-scanner/skill_scanner/core/analyzers/behavioral/alignment/__init__.py
- vendor/skill-scanner/skill_scanner/core/analyzers/behavioral/alignment/alignment_llm_client.py
- vendor/skill-scanner/skill_scanner/core/analyzers/behavioral/alignment/alignment_orchestrator.py
- vendor/skill-scanner/skill_scanner/core/analyzers/behavioral/alignment/alignment_prompt_builder.py
- vendor/skill-scanner/skill_scanner/core/analyzers/behavioral/alignment/alignment_response_validator.py
- vendor/skill-scanner/skill_scanner/core/analyzers/behavioral/alignment/threat_vulnerability_classifier.py
- vendor/skill-scanner/skill_scanner/core/analyzers/behavioral_analyzer.py
- vendor/skill-scanner/skill_scanner/core/analyzers/bytecode_analyzer.py
- vendor/skill-scanner/skill_scanner/core/analyzers/cross_skill_scanner.py
- vendor/skill-scanner/skill_scanner/core/analyzers/llm_analyzer.py
- vendor/skill-scanner/skill_scanner/core/analyzers/llm_prompt_builder.py
- vendor/skill-scanner/skill_scanner/core/analyzers/llm_provider_config.py
- vendor/skill-scanner/skill_scanner/core/analyzers/llm_request_handler.py
- vendor/skill-scanner/skill_scanner/core/analyzers/llm_response_parser.py
- vendor/skill-scanner/skill_scanner/core/analyzers/meta_analyzer.py
- vendor/skill-scanner/skill_scanner/core/analyzers/pipeline_analyzer.py
- vendor/skill-scanner/skill_scanner/core/analyzers/static.py
- vendor/skill-scanner/skill_scanner/core/analyzers/trigger_analyzer.py
- vendor/skill-scanner/skill_scanner/core/analyzers/virustotal_analyzer.py
