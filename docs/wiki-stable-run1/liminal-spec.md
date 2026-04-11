# Liminal Spec

## Overview

Build, validation, and test tooling for the `liminal-spec` package. This module contains three standalone scripts: a build script that compiles the specification artifacts, a validation script that enforces correctness constraints on the spec, and a test suite that verifies the build output.

## Responsibilities

- Compile and bundle the liminal-spec package artifacts via the build script
- Validate specification correctness and structural constraints via the validate script
- Verify build output integrity through automated tests

## Source Coverage

- liminal-spec/scripts/__tests__/build.test.ts
- liminal-spec/scripts/build.ts
- liminal-spec/scripts/validate.ts
