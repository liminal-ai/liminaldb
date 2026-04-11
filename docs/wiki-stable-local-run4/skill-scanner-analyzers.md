# Skill Scanner Analyzers

## Overview

A vendored Python package providing a family of security analyzers for skill (plugin/tool) scanning. Each analyzer targets a different analysis dimension — static pattern matching, behavioral alignment, LLM-assisted review, bytecode inspection, pipeline taint tracking, trigger detection, cross-skill interaction, VirusTotal integration, and AI defense evaluation. A `BaseAnalyzer` defines the shared interface, and a `MetaAnalyzer` aggregates and reconciles results from the individual analyzers.

## Responsibilities

- Define a common analyzer interface via BaseAnalyzer for all security analysis strategies
- Perform static code analysis for known vulnerability patterns (StaticAnalyzer, ~2200 LOC)
- Evaluate behavioral alignment of skills using LLM-driven orchestration (BehavioralAnalyzer + alignment sub-package)
- Provide LLM-based security review with configurable providers, prompt building, request handling, and response parsing
- Analyze Python bytecode for suspicious operations (BytecodeAnalyzer)
- Track taint propagation through shell pipeline chains (PipelineAnalyzer, TaintType, CommandNode, PipelineChain)
- Detect time-based or event-based triggers that may indicate logic bombs (TriggerAnalyzer)
- Aggregate and reconcile findings from multiple analyzers into a unified result (MetaAnalyzer, MetaAnalysisResult)
- Scan for cross-skill interaction risks and privilege escalation paths (CrossSkillScanner)
- Integrate with the VirusTotal API for external threat intelligence (VirusTotalAnalyzer)
- Evaluate AI-specific defense posture and prompt injection resilience (AIDefenseAnalyzer)

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
