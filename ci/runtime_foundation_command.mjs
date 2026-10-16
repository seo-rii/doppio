import {spawn} from 'node:child_process';

// Keep a stable process-group leader until all inherited command pipes close.
// The command may exit before a descendant; its PID must not become the
// supervisor's only ownership proof for a still-running process group.
const [command, ...args] = process.argv.slice(2);
if (!process.connected) process.exit(1);
let completed = false;
process.on('disconnect', () => {
  if (completed) return;
  // The suite can die before its PID-registration message reaches the
  // supervisor. This live group leader still owns an unambiguous group ID.
  if (process.platform !== 'win32') process.kill(-process.pid, 'SIGKILL');
  else process.exit(1);
});
const child = spawn(command, args, {stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true});
process.stdin.pipe(child.stdin);
child.stdin.on('error', error => {
  if (error.code !== 'EPIPE' && process.connected) {
    process.send({type: 'foundation-command-error', message: error.message}, () => {});
  }
});
child.stdout.pipe(process.stdout);
child.stderr.pipe(process.stderr);
child.once('error', error => {
  if (process.connected) process.send({type: 'foundation-command-error', message: error.message}, () => {});
});
child.once('close', (code, signal) => {
  completed = true;
  const complete = () => {
    process.exitCode = code === null || code < 0 ? 1 : code;
    if (process.connected) process.disconnect();
  };
  if (process.connected) process.send({type: 'foundation-command-result', exitCode: code, signal}, complete);
  else complete();
});
