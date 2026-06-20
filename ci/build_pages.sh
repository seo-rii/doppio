#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repo_root"

./node_modules/.bin/grunt \
  --stack \
  release \
  javac:examples \
  copy:examples \
  listings:examples \
  --grunt-ignore-compile-errors
