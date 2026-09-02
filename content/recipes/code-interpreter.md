# Code Interpreter — The Analyst

Run untrusted code in an ephemeral sandbox.

## What it does

Spawns a sandbox, executes Python or shell code, and returns the result. The VM is destroyed after the task, so failed or malicious code cannot persist.

## Primitives

- Sandbox

## Why it matters

LLMs write code, but you should not run it on your own machine. An ephemeral sandbox is the ideal execution environment for generated or untrusted code.
