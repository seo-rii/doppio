#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
artifact="$repo_root/build/modern-bootstrap-overlay/modern-bootstrap.jar"
artifact_hash_file="$repo_root/build/modern-bootstrap-overlay/artifact.sha256"
grunt="$repo_root/node_modules/.bin/grunt"

DOPPIO_FORCE_MODERN_BOOTSTRAP_OVERLAY=1 \
  "$grunt" --stack find_native_java generate_modern_bootstrap_overlay \
  --grunt-ignore-compile-errors
first_hash="$(sha256sum "$artifact" | awk '{print $1}')"
DOPPIO_FORCE_MODERN_BOOTSTRAP_OVERLAY=1 \
  "$grunt" --stack find_native_java generate_modern_bootstrap_overlay \
  --grunt-ignore-compile-errors
second_hash="$(sha256sum "$artifact" | awk '{print $1}')"

if [ "$first_hash" != "$second_hash" ]; then
  echo "Compiler bootstrap overlay is not deterministic: $first_hash != $second_hash" >&2
  exit 1
fi
stored_hash="$(tr -d '\r\n' < "$artifact_hash_file")"
if [ "$stored_hash" != "$second_hash" ]; then
  echo "Stored compiler bootstrap overlay hash does not match the artifact." >&2
  exit 1
fi

entries_output="$(jar tf "$artifact")"
mapfile -t entries <<<"$entries_output"
if [ "${#entries[@]}" -ne 43 ]; then
  echo "Expected 43 compiler bootstrap classes, found ${#entries[@]}." >&2
  exit 1
fi
for entry in "${entries[@]}"; do
  if [[ ! "$entry" =~ ^[A-Za-z0-9_$/]+\.class$ ]]; then
    echo "Unexpected compiler bootstrap overlay entry: $entry" >&2
    exit 1
  fi
done
for required_entry in \
    java/lang/AbstractStringBuilder.class \
    java/lang/Runtime.class \
    java/lang/String.class \
    java/lang/StringBuffer.class \
    java/lang/StringBuilder.class \
    java/lang/invoke/MethodHandle.class \
    java/lang/invoke/MethodHandles.class \
    'java/lang/invoke/MethodHandles$Lookup.class' \
    'java/lang/invoke/MethodHandles$Lookup$ClassOption.class' \
    java/lang/reflect/Field.class \
    java/time/Duration.class \
    java/util/concurrent/TimeUnit.class \
    java/util/regex/Pattern.class; do
  required_found=false
  for entry in "${entries[@]}"; do
    if [ "$entry" = "$required_entry" ]; then
      required_found=true
      break
    fi
  done
  if [ "$required_found" != true ]; then
    echo "Missing compiler bootstrap overlay entry: $required_entry" >&2
    exit 1
  fi
done

echo "Compiler bootstrap overlay smoke passed: $second_hash"
