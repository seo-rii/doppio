import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(__filename), '..');
const workflowPath = process.env.PAGES_WORKFLOW_PATH || path.join(repoRoot, '.github', 'workflows', 'pages.yml');

function stripUnquotedComments(text) {
  return text.split('\n').map((line) => {
    let singleQuoted = false;
    let doubleQuoted = false;
    let escaped = false;
    for (let index = 0; index < line.length; index += 1) {
      const character = line[index];
      if (escaped) {
        escaped = false;
        continue;
      }
      if (character === '\\' && doubleQuoted) {
        escaped = true;
        continue;
      }
      if (character === "'" && !doubleQuoted) {
        if (singleQuoted && line[index + 1] === "'") {
          index += 1;
        } else {
          singleQuoted = !singleQuoted;
        }
        continue;
      }
      if (character === '"' && !singleQuoted) {
        doubleQuoted = !doubleQuoted;
        continue;
      }
      if (
        character === '#' &&
        !singleQuoted &&
        !doubleQuoted &&
        (index === 0 || /\s/.test(line[index - 1]))
      ) {
        return line.slice(0, index).trimEnd();
      }
    }
    return line;
  }).join('\n');
}

const workflow = stripUnquotedComments(fs.readFileSync(workflowPath, 'utf8'));
const workflowLines = workflow.split('\n');

function fail(message) {
  console.error(message);
  process.exit(1);
}

function indentation(line) {
  return line.match(/^ */)[0].length;
}

function directChildIndent(lines, block) {
  let childIndent = Number.POSITIVE_INFINITY;
  for (let index = block.start + 1; index < block.end; index += 1) {
    if (lines[index].trim() === '') {
      continue;
    }
    const lineIndent = indentation(lines[index]);
    if (lineIndent > block.indent) {
      childIndent = Math.min(childIndent, lineIndent);
    }
  }
  return childIndent;
}

function findDirectProperty(lines, block, key) {
  const propertyIndent = directChildIndent(lines, block);
  if (!Number.isFinite(propertyIndent)) {
    return null;
  }
  const prefix = `${key}:`;
  for (let index = block.start + 1; index < block.end; index += 1) {
    if (indentation(lines[index]) !== propertyIndent) {
      continue;
    }
    const content = lines[index].slice(propertyIndent);
    if (content.startsWith(prefix)) {
      return {
        index,
        indent: propertyIndent,
        value: content.slice(prefix.length).trim(),
      };
    }
  }
  return null;
}

function findMappingBlock(lines, parent, key) {
  const property = findDirectProperty(lines, parent, key);
  if (!property || property.value !== '') {
    return null;
  }
  let end = parent.end;
  for (let index = property.index + 1; index < parent.end; index += 1) {
    if (lines[index].trim() !== '' && indentation(lines[index]) <= property.indent) {
      end = index;
      break;
    }
  }
  return {
    start: property.index,
    end,
    indent: property.indent,
  };
}

function normalizeScalar(value) {
  if (value === null || value === undefined) {
    return null;
  }
  if (value.startsWith("'") && value.endsWith("'")) {
    return value.slice(1, -1).replaceAll("''", "'");
  }
  if (value.startsWith('"') && value.endsWith('"')) {
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }
  return value;
}

function findNamedStep(lines, stepsBlock, name) {
  const stepIndent = directChildIndent(lines, stepsBlock);
  if (!Number.isFinite(stepIndent)) {
    return null;
  }
  const matches = [];
  for (let index = stepsBlock.start + 1; index < stepsBlock.end; index += 1) {
    if (indentation(lines[index]) !== stepIndent) {
      continue;
    }
    const nameMatch = lines[index].slice(stepIndent).match(/^-\s+name:\s*(.+?)\s*$/);
    if (!nameMatch || normalizeScalar(nameMatch[1]) !== name) {
      continue;
    }
    let end = stepsBlock.end;
    for (let nextIndex = index + 1; nextIndex < stepsBlock.end; nextIndex += 1) {
      if (lines[nextIndex].trim() !== '' && indentation(lines[nextIndex]) <= stepIndent) {
        end = nextIndex;
        break;
      }
    }
    matches.push({ start: index, end, indent: stepIndent });
  }
  return matches.length === 1 ? matches[0] : null;
}

const rootBlock = { start: -1, end: workflowLines.length, indent: -1 };
const concurrencyBlock = findMappingBlock(workflowLines, rootBlock, 'concurrency');
const concurrencyGroup = concurrencyBlock
  ? normalizeScalar(findDirectProperty(workflowLines, concurrencyBlock, 'group')?.value)
  : null;
const cancelInProgress = concurrencyBlock
  ? normalizeScalar(findDirectProperty(workflowLines, concurrencyBlock, 'cancel-in-progress')?.value)
  : null;

if (concurrencyGroup !== 'pages') {
  fail('Pages workflow must use one repository-wide pages group.');
}
if (cancelInProgress !== 'false') {
  fail('Pages workflow must not cancel an active deployment.');
}

const jobsBlock = findMappingBlock(workflowLines, rootBlock, 'jobs');
const deployJobBlock = jobsBlock ? findMappingBlock(workflowLines, jobsBlock, 'deploy') : null;
const stepsBlock = deployJobBlock ? findMappingBlock(workflowLines, deployJobBlock, 'steps') : null;
const uploadStep = stepsBlock ? findNamedStep(workflowLines, stepsBlock, 'Upload Pages artifact') : null;
const deployStep = stepsBlock ? findNamedStep(workflowLines, stepsBlock, 'Deploy Pages') : null;

const deployAction = deployStep
  ? normalizeScalar(findDirectProperty(workflowLines, deployStep, 'uses')?.value)
  : null;
if (deployAction !== 'actions/deploy-pages@v5') {
  fail('Pages workflow must use actions/deploy-pages@v5.');
}

const expectedArtifactName = 'github-pages-${{ github.run_attempt }}';
const uploadAction = uploadStep
  ? normalizeScalar(findDirectProperty(workflowLines, uploadStep, 'uses')?.value)
  : null;
if (uploadAction !== 'actions/upload-pages-artifact@v5') {
  fail('Pages workflow must use actions/upload-pages-artifact@v5.');
}

const uploadInputs = findMappingBlock(workflowLines, uploadStep, 'with');
const uploadName = uploadInputs
  ? normalizeScalar(findDirectProperty(workflowLines, uploadInputs, 'name')?.value)
  : null;
if (uploadName !== expectedArtifactName) {
  fail('Pages upload artifact name must include github.run_attempt to support failed-job reruns.');
}

const deployInputs = findMappingBlock(workflowLines, deployStep, 'with');
if (!deployInputs) {
  fail('Pages workflow must configure the Deploy Pages step.');
}

const deployArtifactName = normalizeScalar(
  findDirectProperty(workflowLines, deployInputs, 'artifact_name')?.value
);
if (deployArtifactName !== expectedArtifactName) {
  fail('Pages deploy artifact_name must match the run-attempt-specific upload artifact name.');
}

const timeout = normalizeScalar(findDirectProperty(workflowLines, deployInputs, 'timeout')?.value);
if (!timeout || !/^[0-9]+$/.test(timeout)) {
  fail('Pages deploy step must set a timeout input.');
}

const timeoutMs = Number(timeout);
if (!Number.isFinite(timeoutMs) || timeoutMs !== 600000) {
  fail('Pages deploy timeout must stay at the deploy-pages maximum of 600000 ms.');
}

const reportingInterval = normalizeScalar(
  findDirectProperty(workflowLines, deployInputs, 'reporting_interval')?.value
);
if (!reportingInterval || !/^[0-9]+$/.test(reportingInterval)) {
  fail('Pages deploy step must set a reporting_interval input.');
}

const reportingIntervalMs = Number(reportingInterval);
if (!Number.isFinite(reportingIntervalMs) || reportingIntervalMs < 10000) {
  fail('Pages deploy reporting_interval must be at least 10000 ms.');
}

const chromiumInstallStep = stepsBlock
  ? findNamedStep(workflowLines, stepsBlock, 'Install Chromium')
  : null;
const buildStep = stepsBlock ? findNamedStep(workflowLines, stepsBlock, 'Build Pages artifact') : null;
const localSmokeStep = stepsBlock
  ? findNamedStep(workflowLines, stepsBlock, 'Run local browser playground smoke')
  : null;
const chromiumInstallCommand = chromiumInstallStep
  ? normalizeScalar(findDirectProperty(workflowLines, chromiumInstallStep, 'run')?.value)
  : null;
const localSmokeCommand = localSmokeStep
  ? normalizeScalar(findDirectProperty(workflowLines, localSmokeStep, 'run')?.value)
  : null;

if (
  !chromiumInstallStep ||
  !/^\.\/node_modules\/\.bin\/playwright\s+install\s+--with-deps\s+chromium\b/.test(
    chromiumInstallCommand || ''
  )
) {
  fail('Pages workflow must install Chromium for its local acceptance gate.');
}
if (
  !localSmokeStep ||
  !/^\.\/ci\/run_pages_browser_smoke\.sh\b/.test(localSmokeCommand || '')
) {
  fail('Pages workflow must run the local Chromium acceptance gate.');
}
if (
  !buildStep ||
  chromiumInstallStep.start > localSmokeStep.start ||
  buildStep.start > localSmokeStep.start ||
  localSmokeStep.start > uploadStep.start ||
  uploadStep.start > deployStep.start
) {
  fail('Pages workflow must pass the local Chromium gate after building and before upload/deploy.');
}

console.log('Pages workflow deployment settings checks passed.');
