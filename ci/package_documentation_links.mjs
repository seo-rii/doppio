import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

// The source contract supplies the package allowlist; the installed-consumer
// check uses the actual filesystem. Both must interpret documentation links alike.
export function validatePackagedRelativeLinks(packageRoot, relativePaths, {
  readFile = (filename) => fs.readFileSync(filename, 'utf8'),
  exists = (filename) => fs.existsSync(filename)
} = {}) {
  const errors = [];
  for (const relativePath of relativePaths) {
    const contents = readFile(path.join(packageRoot, relativePath));
    const targets = [];
    if (relativePath.endsWith('.md')) {
      for (const match of contents.matchAll(/\]\(([^)]+)\)/g)) {
        targets.push(match[1]);
      }
    } else if (relativePath.endsWith('.html')) {
      for (const match of contents.matchAll(/(?:href|src)=["']([^"']+)["']/g)) {
        targets.push(match[1]);
      }
    }

    for (let target of targets) {
      target = target.trim().replace(/^<|>$/g, '').split('#', 1)[0].split('?', 1)[0];
      if (target.length === 0 || target.startsWith('/') || /^[a-z][a-z0-9+.-]*:/i.test(target)) {
        continue;
      }
      const resolvedTarget = path.resolve(packageRoot, path.dirname(relativePath), decodeURIComponent(target));
      if (resolvedTarget !== packageRoot && !resolvedTarget.startsWith(`${packageRoot}${path.sep}`)) {
        errors.push(`${relativePath} links outside the package: ${target}`);
      } else if (!exists(resolvedTarget)) {
        errors.push(`${relativePath} has a broken packaged relative link: ${target}`);
      }
    }
  }
  assert.deepEqual(errors, [], `Packaged documentation links failed:\n${errors.join('\n')}`);
}
