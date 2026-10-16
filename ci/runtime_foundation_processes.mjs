import fs from 'node:fs';

const processMessage = 'doppio-foundation-process';
export const cancellationMessage = 'doppio-foundation-abort';

// The Linux CI supervisor verifies both ancestry and the kernel start time.
// A delayed IPC message must never authorize killing a reused, unrelated PID.
export function processIdentity(pid) {
  if (process.platform !== 'linux' || !Number.isSafeInteger(pid) || pid <= 0) return null;
  try {
    const stat = fs.readFileSync(`/proc/${pid}/stat`, 'utf8');
    const fields = stat.slice(stat.lastIndexOf(') ') + 2).split(' ');
    return {pid, state: fields[0], parent: Number(fields[1]), group: Number(fields[2]), startTime: fields[19]};
  } catch (error) {
    if (error.code === 'ENOENT' || error.code === 'ESRCH') return null;
    throw error;
  }
}

function notify(message) {
  if (process.connected && process.send && process.env.DOPPIO_FOUNDATIONS_RUN_ID) {
    process.send({...message, runId: process.env.DOPPIO_FOUNDATIONS_RUN_ID}, () => {});
  }
}

export function trackFoundationProcess(child) {
  if (!process.connected || !process.send || !process.env.DOPPIO_FOUNDATIONS_RUN_ID) return () => {};
  const identity = processIdentity(child.pid);
  if (!identity || identity.group !== identity.pid) return () => {};
  let registered = true;
  notify({type: processMessage, operation: 'start', identity});
  const onOwnerExit = () => {
    if (registered) killFoundationProcess(identity);
  };
  process.once('exit', onOwnerExit);
  const release = () => {
    if (!registered) return;
    registered = false;
    notify({type: processMessage, operation: 'stop', identity});
    child.removeListener('close', release);
    process.removeListener('exit', onOwnerExit);
  };
  child.once('close', release);
  return release;
}

export function ownedFoundationProcess(message, runId, ownerPid) {
  if (message?.type !== processMessage || message.runId !== runId) return null;
  const identity = message.identity;
  if (!identity || !['start', 'stop'].includes(message.operation)) return null;
  if (message.operation === 'stop') return identity;
  let current = processIdentity(identity.pid);
  if (!current || current.group !== current.pid || current.startTime !== identity.startTime) return null;
  const original = current;
  for (let depth = 0; depth < 100 && current; depth++) {
    if (current.parent === ownerPid) return original;
    current = current.parent > 1 ? processIdentity(current.parent) : null;
  }
  return null;
}

export function killFoundationProcess(identity) {
  const current = processIdentity(identity.pid);
  if (!current || current.startTime !== identity.startTime || current.group !== identity.pid) return false;
  try {
    process.kill(-identity.pid, 'SIGKILL');
    return true;
  } catch (error) {
    if (error.code !== 'ESRCH') throw error;
    return false;
  }
}

export function createFoundationCancellation() {
  const controller = new AbortController();
  const onSignal = signal => controller.abort(new Error(`Foundation suite interrupted by ${signal}.`));
  const terminate = () => onSignal('SIGTERM');
  const interrupt = () => onSignal('SIGINT');
  const onMessage = message => {
    if (message?.type === cancellationMessage && message.runId === process.env.DOPPIO_FOUNDATIONS_RUN_ID) {
      controller.abort(new Error(message.reason));
    }
  };
  process.on('SIGTERM', terminate);
  process.on('SIGINT', interrupt);
  if (process.env.DOPPIO_FOUNDATIONS_RUN_ID) process.on('message', onMessage);
  return {
    signal: controller.signal,
    dispose() {
      process.removeListener('SIGTERM', terminate);
      process.removeListener('SIGINT', interrupt);
      process.removeListener('message', onMessage);
    }
  };
}
