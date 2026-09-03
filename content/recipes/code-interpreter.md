# Code Interpreter — The Analyst

Run untrusted code in an ephemeral sandbox.

## What it does

Spawns a sandbox, executes Python or shell code, and returns the result. The VM is destroyed after the task, so failed or malicious code cannot persist.

## Primitives

- Sandbox

## Why it matters

LLMs write code, but you should not run it on your own machine. An ephemeral sandbox is the ideal execution environment for generated or untrusted code. The essay thesis: *LLMs write code — where it runs is the whole security model.*

**The experience (planned): untrusted code, staged.** The visitor pastes code and watches it execute inside a live-visualized ephemeral VM — process tree, filesystem churn, network calls — then watches the VM die. The ephemerality is the spectacle: the teardown moment is the demo.

## Solari foundation

- `examples/sandbox-code-interpreter-py`

## Status

Cooking. Source available; experience shipping. See [`content/roadmap.md`](../roadmap.md).
