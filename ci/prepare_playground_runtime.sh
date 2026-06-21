#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
runtime_dir="$repo_root/docs/playground/runtime"
kotlin_version="${KOTLIN_COMPILER_VERSION:-2.4.0}"
scala_version="${SCALA_COMPILER_VERSION:-2.13.18}"
kotlin_cache="$repo_root/build/kotlin-smoke-cache"
scala_cache="$repo_root/build/scala-smoke-cache"

download_scala_jar() {
  local group_path="$1"
  local artifact="$2"
  local version="$3"
  local classifier="${4:-}"
  local suffix=""
  if [ -n "$classifier" ]; then
    suffix="-$classifier"
  fi
  local filename="$artifact-$version$suffix.jar"
  local target="$scala_cache/$filename"
  if [ ! -f "$target" ]; then
    mkdir -p "$scala_cache"
    curl -fsSL "https://repo1.maven.org/maven2/$group_path/$artifact/$version/$filename" -o "$target"
  fi
  printf '%s\n' "$target"
}

rm -rf "$runtime_dir"
mkdir -p "$runtime_dir/compilers/kotlin" "$runtime_dir/compilers/scala"

cp "$repo_root/build/release/doppio.js" "$runtime_dir/doppio.js"
cp "$repo_root/node_modules/browserfs/dist/browserfs.min.js" "$runtime_dir/browserfs.min.js"
cp -R "$repo_root/vendor" "$runtime_dir/vendor"

kotlin_dist="$kotlin_cache/kotlin-compiler-$kotlin_version"
kotlin_tarball="$kotlin_cache/kotlin-compiler-$kotlin_version.tgz"
if [ ! -f "$kotlin_dist/package/lib/kotlin-compiler.jar" ]; then
  mkdir -p "$kotlin_cache"
  if [ ! -f "$kotlin_tarball" ]; then
    curl -fsSL "https://registry.npmjs.org/kotlin-compiler/-/kotlin-compiler-$kotlin_version.tgz" -o "$kotlin_tarball"
  fi
  rm -rf "$kotlin_dist"
  mkdir -p "$kotlin_dist"
  tar -xzf "$kotlin_tarball" -C "$kotlin_dist"
fi
cp "$kotlin_dist/package/lib/"*.jar "$runtime_dir/compilers/kotlin/"

scala_compiler="$(download_scala_jar org/scala-lang scala-compiler "$scala_version")"
scala_library="$(download_scala_jar org/scala-lang scala-library "$scala_version")"
scala_reflect="$(download_scala_jar org/scala-lang scala-reflect "$scala_version")"
scala_diff="$(download_scala_jar io/github/java-diff-utils java-diff-utils 4.16)"
scala_jline="$(download_scala_jar org/jline jline 3.29.0 jdk8)"
cp "$scala_compiler" "$scala_library" "$scala_reflect" "$scala_diff" "$scala_jline" \
  "$runtime_dir/compilers/scala/"

(
  cd "$runtime_dir"
  "$repo_root/node_modules/.bin/make_xhrfs_index" listings.json
)
