/** Keep cooperative execution budgets finite and within signed timer arithmetic. */
export function validateResponsiveness(value: number): number {
  if (typeof value !== 'number' || !isFinite(value) || Math.floor(value) !== value ||
      value < 1 || value > 0x7fffffff) {
    throw new RangeError('responsiveness must be an integer from 1 through 2147483647 milliseconds.');
  }
  return value;
}
