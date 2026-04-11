# Skill Scanner Static Analysis

## Overview

A vendored Python static analysis subsystem within the skill-scanner package. It provides a layered analysis pipeline covering AST parsing, control-flow graph construction, dataflow analysis, taint tracking (both Python and Bash), semantic analysis (name resolution and type inference), interprocedural/cross-file analysis, and content/context extraction. These components work together to analyze skill scripts for security-relevant data flows and structural properties.

## Responsibilities

- Parse Python source into AST representations and extract function-level metadata (PythonParser, FunctionInfo)
- Build control-flow graphs from parsed code and perform CFG-based data flow analysis (CFGNode, ControlFlowGraph, DataFlowAnalyzer)
- Execute forward dataflow analysis to track flow facts and paths through programs (ForwardDataflowAnalysis, ForwardFlowFact, FlowPath)
- Track taint propagation in Python code with shape-aware taint environments (TaintStatus, Taint, TaintShape, ShapeEnvironment)
- Analyze bash scripts for taint flows from sources to sinks (BashTaintType, TaintedVariable, BashTaintFlow, analyze_bash_script)
- Resolve names and scopes within analyzed code (NameResolver, Scope)
- Infer and track types across expressions (TypeAnalyzer, TypeKind, Type)
- Build call graphs and perform interprocedural analysis across functions and files (CallGraphAnalyzer, CallGraph, CrossFileAnalyzer, CrossFileCorrelation)
- Extract structured context from skill scripts and functions (ContextExtractor, SkillScriptContext, SkillFunctionContext)
- Extract content from files with configurable limits (ContentExtractor, ExtractionLimits, ExtractionResult)

## Source Coverage

- vendor/skill-scanner/skill_scanner/core/extractors/__init__.py
- vendor/skill-scanner/skill_scanner/core/extractors/content_extractor.py
- vendor/skill-scanner/skill_scanner/core/static_analysis/__init__.py
- vendor/skill-scanner/skill_scanner/core/static_analysis/bash_taint_tracker.py
- vendor/skill-scanner/skill_scanner/core/static_analysis/cfg/__init__.py
- vendor/skill-scanner/skill_scanner/core/static_analysis/cfg/builder.py
- vendor/skill-scanner/skill_scanner/core/static_analysis/context_extractor.py
- vendor/skill-scanner/skill_scanner/core/static_analysis/dataflow/__init__.py
- vendor/skill-scanner/skill_scanner/core/static_analysis/dataflow/forward_analysis.py
- vendor/skill-scanner/skill_scanner/core/static_analysis/interprocedural/__init__.py
- vendor/skill-scanner/skill_scanner/core/static_analysis/interprocedural/call_graph_analyzer.py
- vendor/skill-scanner/skill_scanner/core/static_analysis/interprocedural/cross_file_analyzer.py
- vendor/skill-scanner/skill_scanner/core/static_analysis/parser/__init__.py
- vendor/skill-scanner/skill_scanner/core/static_analysis/parser/python_parser.py
- vendor/skill-scanner/skill_scanner/core/static_analysis/semantic/__init__.py
- vendor/skill-scanner/skill_scanner/core/static_analysis/semantic/name_resolver.py
- vendor/skill-scanner/skill_scanner/core/static_analysis/semantic/type_analyzer.py
- vendor/skill-scanner/skill_scanner/core/static_analysis/taint/__init__.py
- vendor/skill-scanner/skill_scanner/core/static_analysis/taint/tracker.py
- vendor/skill-scanner/skill_scanner/core/static_analysis/types/__init__.py
