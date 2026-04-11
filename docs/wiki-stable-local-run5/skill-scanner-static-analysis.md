# Skill Scanner Static Analysis

## Overview

Vendored static analysis subsystem within the Skill Scanner. It provides AST parsing, control-flow graph construction, forward dataflow analysis, taint tracking (Python and Bash), type/name resolution, interprocedural call-graph and cross-file analysis, and skill context extraction. The module is organized into focused sub-packages: `parser`, `cfg`, `dataflow`, `taint`, `semantic`, `interprocedural`, and a top-level `context_extractor` and `bash_taint_tracker`.

## Responsibilities

- Parse Python source into AST representations and extract function-level metadata (PythonParser, FunctionInfo)
- Build control-flow graphs (CFGNode, ControlFlowGraph) and perform basic dataflow analysis over them (DataFlowAnalyzer)
- Run forward dataflow analysis with flow facts and path tracking (ForwardDataflowAnalysis, ForwardFlowFact, FlowPath)
- Track taint propagation through Python code via taint shapes and environments (TaintStatus, Taint, TaintShape, ShapeEnvironment)
- Analyze Bash scripts for taint flows from sources to sinks (analyze_bash_script, BashTaintType, BashTaintFlow, TaintedVariable)
- Resolve names and scopes within analyzed code (NameResolver, Scope)
- Infer and represent types for analyzed expressions (TypeAnalyzer, TypeKind, Type)
- Build interprocedural call graphs and correlate findings across files (CallGraphAnalyzer, CallGraph, CrossFileAnalyzer, CrossFileCorrelation)
- Extract high-level skill script and function context for downstream consumers (ContextExtractor, SkillScriptContext, SkillFunctionContext)
- Provide shared positional types (Position, Range) used across the analysis pipeline

## Source Coverage

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
