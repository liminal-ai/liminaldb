# Skill Scanner Static Analysis

## Overview

Vendored Python static analysis subsystem within the Skill Scanner. Provides a layered analysis pipeline covering AST parsing, control-flow graph construction, taint tracking (Python and Bash), forward dataflow analysis, interprocedural call-graph and cross-file correlation, semantic name resolution, and type inference. Shared types (`Position`, `Range`) anchor source-location data across all layers.

## Responsibilities

- Parse Python source into AST representations and extract function-level metadata (`PythonParser`, `FunctionInfo`)
- Build control-flow graphs from parsed code and run basic dataflow analysis over CFG nodes (`CFGNode`, `ControlFlowGraph`, `DataFlowAnalyzer`)
- Track taint propagation through Python code with shape-aware environments (`TaintStatus`, `Taint`, `TaintShape`, `ShapeEnvironment`)
- Analyze Bash scripts for taint flows from sources to sinks (`analyze_bash_script`, `BashTaintType`, `BashTaintFlow`)
- Perform forward dataflow analysis to compute flow facts and paths (`ForwardDataflowAnalysis`, `ForwardFlowFact`, `FlowPath`)
- Construct interprocedural call graphs and correlate findings across files (`CallGraphAnalyzer`, `CrossFileAnalyzer`)
- Resolve names through nested scopes and infer types (`NameResolver`, `Scope`, `TypeAnalyzer`, `TypeKind`)
- Extract high-level skill-script and function context for downstream consumers (`ContextExtractor`, `SkillScriptContext`, `SkillFunctionContext`)

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
