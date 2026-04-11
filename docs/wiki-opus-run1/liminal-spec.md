# Liminal Spec

## Overview

Build and validation tooling for the `liminal-spec` format. This module contains standalone scripts that compile spec source files into a distributable format and validate spec documents against the expected schema. A companion test suite verifies the build pipeline.

## Responsibilities

- Build liminal-spec source files into a compiled output
- Validate liminal-spec documents for schema correctness
- Provide automated test coverage for the build pipeline

## Source Coverage

- liminal-spec/scripts/__tests__/build.test.ts
- liminal-spec/scripts/build.ts
- liminal-spec/scripts/validate.ts
