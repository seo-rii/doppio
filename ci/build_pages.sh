#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repo_root"

./node_modules/.bin/grunt --stack pages-release --grunt-ignore-compile-errors
./ci/prepare_playground_runtime.sh
./node_modules/.bin/vite build --config vite.site.config.mjs
node ci/check_pages_site.mjs
