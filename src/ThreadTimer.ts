import gLong from './gLong';
import global from './global';

// Node and browsers cannot represent a single timer beyond a signed 32-bit
// delay. Keep the Java long intact and arm only the next bounded portion.
const maximumDelay = 0x7fffffff;
const maximumDelayLong = gLong.fromNumber(maximumDelay);

export default function scheduleThreadTimeout(callback: () => void, delay: gLong | number): () => void {
  var remaining = typeof delay === 'number' ? gLong.fromNumber(delay) : delay;
  if (remaining.isNegative()) remaining = gLong.ZERO;
  var timer: any, cancelled = false, started: number;
  var now = global.performance && typeof global.performance.now === 'function' ?
    () => global.performance.now() : () => Date.now();
  var arm = () => {
    started = now();
    timer = setTimeout(() => {
      timer = null;
      if (cancelled) return;
      // Account for a delayed event loop, while keeping sub-millisecond early
      // callbacks from completing an outstanding whole millisecond.
      var elapsed = Math.max(0, Math.floor(now() - started));
      remaining = remaining.subtract(gLong.fromNumber(elapsed));
      if (remaining.greaterThan(gLong.ZERO)) {
        arm();
      } else {
        cancelled = true;
        callback();
      }
    }, remaining.greaterThan(maximumDelayLong) ? maximumDelay : Math.max(0, remaining.toNumber()));
  };
  arm();
  return () => {
    if (cancelled) return;
    cancelled = true;
    if (timer != null) clearTimeout(timer);
    timer = null;
  };
}
