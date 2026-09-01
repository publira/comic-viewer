#!/usr/bin/env bash

set -euo pipefail

sudo chown -R vscode:vscode \
  /home/vscode/.claude \
  /home/vscode/.codex \
  /home/vscode/.config \
  /home/vscode/.gemini \
  /home/vscode/.grok

corepack enable
export COREPACK_ENABLE_DOWNLOAD_PROMPT=0

pnpm install
