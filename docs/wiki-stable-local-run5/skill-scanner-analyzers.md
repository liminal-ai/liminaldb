# Skill Scanner Analyzers

## Overview

A vendored Python module providing a family of security analyzers for scanning skills (code artifacts). The analyzers span static analysis, behavioral/alignment analysis, LLM-powered review, bytecode inspection, pipeline taint tracking, trigger detection, cross-skill scanning, meta-analysis aggregation, AI defense checks, and VirusTotal integration. All concrete analyzers share a common `BaseAnalyzer` contract defined in `base.py`.

## Responsibilities

- Define the `BaseAnalyzer` interface that all security analyzers implement
- Perform static code analysis for security patterns and vulnerabilities (StaticAnalyzer, ~2200 LOC)
- Run behavioral analysis including LLM-based alignment checks via an orchestrator, prompt builder, response validator, and threat classifier
- Provide LLM-powered security review with configurable providers, prompt construction, request handling, and response parsing
- Analyze Python bytecode for suspicious operations (BytecodeAnalyzer)
- Track taint propagation through shell pipelines and command chains (PipelineAnalyzer, TaintType, CommandNode, PipelineChain)
- Detect time-based or event-based triggers that could indicate logic bombs (TriggerAnalyzer)
- Scan for cross-skill interaction risks and privilege escalation paths (CrossSkillScanner)
- Aggregate and correlate findings from multiple analyzers into a unified risk assessment (MetaAnalyzer, MetaAnalysisResult)
- Integrate with Cisco AI Defense for external AI-security analysis (AIDefenseAnalyzer)
- Query VirusTotal for known malware signatures and reputation data (VirusTotalAnalyzer)

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
