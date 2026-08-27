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
  const matches = [];
  for (let index = block.start + 1; index < block.end; index += 1) {
    if (indentation(lines[index]) !== propertyIndent) {
      continue;
    }
    const content = lines[index].slice(propertyIndent);
    if (content.startsWith(prefix)) {
      matches.push({
        index,
        indent: propertyIndent,
        value: content.slice(prefix.length).trim(),
      });
    }
  }
  return matches.length === 1 ? matches[0] : null;
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

function listSequenceItems(lines, sequenceBlock) {
  const itemIndent = directChildIndent(lines, sequenceBlock);
  if (!Number.isFinite(itemIndent)) {
    return [];
  }
  const items = [];
  for (let index = sequenceBlock.start + 1; index < sequenceBlock.end; index += 1) {
    if (indentation(lines[index]) !== itemIndent || !lines[index].slice(itemIndent).startsWith('-')) {
      continue;
    }
    let end = sequenceBlock.end;
    for (let nextIndex = index + 1; nextIndex < sequenceBlock.end; nextIndex += 1) {
      if (lines[nextIndex].trim() !== '' && indentation(lines[nextIndex]) <= itemIndent) {
        end = nextIndex;
        break;
      }
    }
    items.push({ start: index, end, indent: itemIndent });
  }
  return items;
}

function findNamedStep(lines, stepsBlock, name) {
  const matches = listSequenceItems(lines, stepsBlock).filter((step) => {
    const nameMatch = lines[step.start].slice(step.indent).match(/^-\s+name:\s*(.+?)\s*$/);
    return nameMatch && normalizeScalar(nameMatch[1]) === name;
  });
  return matches.length === 1 ? matches[0] : null;
}

function mappingMatches(lines, block, expectedEntries) {
  if (!block) {
    return false;
  }
  const entryIndent = directChildIndent(lines, block);
  if (!Number.isFinite(entryIndent)) {
    return expectedEntries.length === 0;
  }
  let entryCount = 0;
  for (let index = block.start + 1; index < block.end; index += 1) {
    if (lines[index].trim() === '' || indentation(lines[index]) !== entryIndent) {
      continue;
    }
    if (!/^[A-Za-z0-9_-]+:\s*.*$/.test(lines[index].slice(entryIndent))) {
      return false;
    }
    entryCount += 1;
  }
  return entryCount === expectedEntries.length && expectedEntries.every(([key, value]) => (
    normalizeScalar(findDirectProperty(lines, block, key)?.value) === value
  ));
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

const workflowPermissions = normalizeScalar(
  findDirectProperty(workflowLines, rootBlock, 'permissions')?.value
);
if (workflowPermissions !== '{}') {
  fail('Pages workflow must not grant deployment permissions at workflow scope.');
}

const jobsBlock = findMappingBlock(workflowLines, rootBlock, 'jobs');
const buildJobBlock = jobsBlock ? findMappingBlock(workflowLines, jobsBlock, 'build') : null;
const deployJobBlock = jobsBlock ? findMappingBlock(workflowLines, jobsBlock, 'deploy') : null;
const browserSmokeJobBlock = jobsBlock
  ? findMappingBlock(workflowLines, jobsBlock, 'browser-smoke')
  : null;
if (!buildJobBlock) {
  fail('Pages workflow is missing the build job.');
}
if (!deployJobBlock) {
  fail('Pages workflow is missing the deploy job.');
}
if (!browserSmokeJobBlock) {
  fail('Pages workflow is missing the browser-smoke job.');
}

if (!mappingMatches(
  workflowLines,
  findMappingBlock(workflowLines, buildJobBlock, 'permissions'),
  [['contents', 'read'], ['pages', 'read']]
)) {
  fail('Pages workflow build permissions must be exactly the required least-privilege set.');
}
if (!mappingMatches(
  workflowLines,
  findMappingBlock(workflowLines, deployJobBlock, 'permissions'),
  [['pages', 'write'], ['id-token', 'write']]
)) {
  fail('Pages workflow deploy permissions must be exactly the required least-privilege set.');
}
if (!mappingMatches(
  workflowLines,
  findMappingBlock(workflowLines, browserSmokeJobBlock, 'permissions'),
  [['contents', 'read']]
)) {
  fail('Pages workflow browser-smoke permissions must be exactly the required least-privilege set.');
}

const expectedArtifactName = 'github-pages-${{ github.run_attempt }}';
const buildArtifactReference = '${{ steps.pages-artifact.outputs.name }}';
const deployArtifactReference = '${{ needs.build.outputs.artifact_name }}';
const buildOutputs = findMappingBlock(workflowLines, buildJobBlock, 'outputs');
const buildArtifactOutput = buildOutputs
  ? normalizeScalar(findDirectProperty(workflowLines, buildOutputs, 'artifact_name')?.value)
  : null;
if (buildArtifactOutput !== buildArtifactReference) {
  fail('Pages workflow build job must expose the exact uploaded artifact name.');
}

const buildStepsBlock = findMappingBlock(workflowLines, buildJobBlock, 'steps');
const deployStepsBlock = findMappingBlock(workflowLines, deployJobBlock, 'steps');
const browserStepsBlock = findMappingBlock(workflowLines, browserSmokeJobBlock, 'steps');
if (!buildStepsBlock || !deployStepsBlock || !browserStepsBlock) {
  fail('Pages workflow jobs must define their required steps.');
}

const chromiumInstallStep = findNamedStep(workflowLines, buildStepsBlock, 'Install Chromium');
const buildStep = findNamedStep(workflowLines, buildStepsBlock, 'Build Pages artifact');
const localSmokeStep = findNamedStep(
  workflowLines,
  buildStepsBlock,
  'Run local browser playground smoke'
);
const artifactNameStep = findNamedStep(workflowLines, buildStepsBlock, 'Define Pages artifact name');
const uploadStep = findNamedStep(workflowLines, buildStepsBlock, 'Upload Pages artifact');
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
if (!localSmokeStep || !/^\.\/ci\/run_pages_browser_smoke\.sh\b/.test(localSmokeCommand || '')) {
  fail('Pages workflow must run the local Chromium acceptance gate.');
}

const artifactStepId = artifactNameStep
  ? normalizeScalar(findDirectProperty(workflowLines, artifactNameStep, 'id')?.value)
  : null;
const artifactNameCommand = artifactNameStep
  ? normalizeScalar(findDirectProperty(workflowLines, artifactNameStep, 'run')?.value)
  : null;
if (
  artifactStepId !== 'pages-artifact' ||
  artifactNameCommand !== `echo "name=${expectedArtifactName}" >> "$GITHUB_OUTPUT"`
) {
  fail('Pages workflow must derive its artifact name once from github.run_attempt in the build job.');
}

const uploadAction = uploadStep
  ? normalizeScalar(findDirectProperty(workflowLines, uploadStep, 'uses')?.value)
  : null;
if (uploadAction !== 'actions/upload-pages-artifact@v5') {
  fail('Pages workflow must use actions/upload-pages-artifact@v5 in the build job.');
}
const uploadInputs = findMappingBlock(workflowLines, uploadStep, 'with');
const uploadName = uploadInputs
  ? normalizeScalar(findDirectProperty(workflowLines, uploadInputs, 'name')?.value)
  : null;
if (uploadName !== buildArtifactReference) {
  fail('Pages upload artifact name must use the build artifact-name step output.');
}

const buildItems = listSequenceItems(workflowLines, buildStepsBlock);
const buildUploadItems = buildItems.filter((step) => (
  normalizeScalar(findDirectProperty(workflowLines, step, 'uses')?.value)?.startsWith(
    'actions/upload-pages-artifact@'
  )
));
const buildDeployItems = buildItems.filter((step) => (
  normalizeScalar(findDirectProperty(workflowLines, step, 'uses')?.value)?.startsWith(
    'actions/deploy-pages@'
  )
));
if (
  buildUploadItems.length !== 1 ||
  buildUploadItems[0].start !== uploadStep.start ||
  buildDeployItems.length !== 0
) {
  fail('Pages workflow build job must upload, but never deploy, the Pages artifact.');
}
if (
  !buildStep ||
  !artifactNameStep ||
  chromiumInstallStep.start > localSmokeStep.start ||
  buildStep.start > localSmokeStep.start ||
  localSmokeStep.start > artifactNameStep.start ||
  artifactNameStep.start > uploadStep.start
) {
  fail('Pages workflow must pass the local Chromium gate before naming and uploading the artifact.');
}

const deployNeeds = normalizeScalar(
  findDirectProperty(workflowLines, deployJobBlock, 'needs')?.value
);
if (deployNeeds !== 'build') {
  fail('Pages workflow deploy job must depend on the build job.');
}
const deployItems = listSequenceItems(workflowLines, deployStepsBlock);
const deployStep = findNamedStep(workflowLines, deployStepsBlock, 'Deploy Pages');
const deployAction = deployStep
  ? normalizeScalar(findDirectProperty(workflowLines, deployStep, 'uses')?.value)
  : null;
const deployStepId = deployStep
  ? normalizeScalar(findDirectProperty(workflowLines, deployStep, 'id')?.value)
  : null;
if (deployAction !== 'actions/deploy-pages@v5') {
  fail('Pages workflow must use actions/deploy-pages@v5.');
}
if (
  deployItems.length !== 1 ||
  !deployStep ||
  deployItems[0].start !== deployStep.start ||
  deployStepId !== 'deployment' ||
  findDirectProperty(workflowLines, deployStep, 'run')
) {
  fail('Pages workflow deploy job must be a dedicated deploy-pages action with no repository code.');
}

const deployInputs = findMappingBlock(workflowLines, deployStep, 'with');
if (!deployInputs) {
  fail('Pages workflow must configure the Deploy Pages step.');
}
const deployArtifactName = normalizeScalar(
  findDirectProperty(workflowLines, deployInputs, 'artifact_name')?.value
);
if (deployArtifactName !== deployArtifactReference) {
  fail('Pages deploy artifact_name must consume the exact build job artifact output.');
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

const deploymentPageUrl = '${{ steps.deployment.outputs.page_url }}';
const deployOutputs = findMappingBlock(workflowLines, deployJobBlock, 'outputs');
const deployEnvironment = findMappingBlock(workflowLines, deployJobBlock, 'environment');
if (
  !mappingMatches(workflowLines, deployOutputs, [['page_url', deploymentPageUrl]]) ||
  !mappingMatches(workflowLines, deployEnvironment, [
    ['name', 'github-pages'],
    ['url', deploymentPageUrl],
  ])
) {
  fail('Pages workflow deploy job must expose the deployment page_url through github-pages.');
}

const browserNeeds = normalizeScalar(
  findDirectProperty(workflowLines, browserSmokeJobBlock, 'needs')?.value
);
const browserSmokeStep = findNamedStep(
  workflowLines,
  browserStepsBlock,
  'Run browser playground smoke'
);
const browserSmokeEnv = browserSmokeStep
  ? findMappingBlock(workflowLines, browserSmokeStep, 'env')
  : null;
const browserPageUrl = browserSmokeEnv
  ? normalizeScalar(findDirectProperty(workflowLines, browserSmokeEnv, 'DOPPIO_PAGES_URL')?.value)
  : null;
const browserSmokeCommand = browserSmokeStep
  ? normalizeScalar(findDirectProperty(workflowLines, browserSmokeStep, 'run')?.value)
  : null;
const browserItems = listSequenceItems(workflowLines, browserStepsBlock);
const browserDeploymentActions = browserItems.filter((step) => {
  const action = normalizeScalar(findDirectProperty(workflowLines, step, 'uses')?.value);
  return action?.startsWith('actions/deploy-pages@') ||
    action?.startsWith('actions/upload-pages-artifact@');
});
if (
  browserNeeds !== 'deploy' ||
  !browserSmokeStep ||
  browserPageUrl !== '${{ needs.deploy.outputs.page_url }}' ||
  !/^yarn\s+site:browser-test\b/.test(browserSmokeCommand || '') ||
  browserDeploymentActions.length !== 0
) {
  fail('Pages workflow browser-smoke job must consume only the deploy job page_url.');
}

console.log('Pages workflow deployment settings checks passed.');
