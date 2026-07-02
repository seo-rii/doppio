import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(__filename), '..');
const ciDir = process.env.MODERN_JAVA_WORKFLOW_CI_DIR || path.join(repoRoot, 'ci');
const workflowPath = process.env.MODERN_JAVA_WORKFLOW_PATH || path.join(repoRoot, '.github', 'workflows', 'modern-java.yml');

const workflow = fs.readFileSync(workflowPath, 'utf8');
const smokeScriptPattern = /^(?:kotlin|scala).*_smoke\.sh$/;
const expectedScripts = fs
  .readdirSync(ciDir)
  .filter((name) => smokeScriptPattern.test(name))
  .sort();

const referencedScripts = new Set();
for (const match of workflow.matchAll(/run:\s*(?:\|\s*)?\n?\s*(?:env\s+)?\.\/ci\/([A-Za-z0-9_./-]+_smoke\.sh)\b/g)) {
  referencedScripts.add(path.basename(match[1]));
}

const missingScripts = expectedScripts.filter((script) => !referencedScripts.has(script));
const unknownScripts = [...referencedScripts]
  .filter((script) => smokeScriptPattern.test(script) && !expectedScripts.includes(script))
  .sort();

if (missingScripts.length > 0 || unknownScripts.length > 0) {
  if (missingScripts.length > 0) {
    console.error('Modern Java workflow is missing smoke scripts:');
    for (const script of missingScripts) {
      console.error(`  - ci/${script}`);
    }
  }

  if (unknownScripts.length > 0) {
    console.error('Modern Java workflow references unknown smoke scripts:');
    for (const script of unknownScripts) {
      console.error(`  - ci/${script}`);
    }
  }

  process.exit(1);
}

console.log(`Modern Java workflow references ${expectedScripts.length} Kotlin/Scala smoke scripts.`);
