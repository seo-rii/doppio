#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repo_root"

port="${DOPPIO_PAGES_PORT:-4173}"
host="127.0.0.1"
url="http://${host}:${port}"
log_file="${TMPDIR:-/tmp}/doppio-pages-server.log"

python3 -m http.server "$port" --bind "$host" --directory docs >"$log_file" 2>&1 &
server_pid="$!"
trap 'kill "$server_pid" >/dev/null 2>&1 || true' EXIT

for _ in $(seq 1 60); do
  if curl -fsS "$url/" >/dev/null; then
    DOPPIO_PAGES_URL="$url" yarn site:browser-test
    exit 0
  fi
  sleep 1
done

echo "Pages smoke server did not become ready at $url" >&2
cat "$log_file" >&2 || true
exit 1
