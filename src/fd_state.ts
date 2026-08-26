/**
 * Stores runtime state for every open file descriptor in the JVM.
 * Shared globally amongst JVM instances since this state is global.
 * We need to track this data since Node.js does not expose all OS descriptor
 * state and BrowserFS only accepts string open modes.
 */
export interface FDOperationLease {
  fd: number;
  generation: number;
  id: number;
  released: boolean;
}

export interface FDCloseInfo {
  fd: number;
  generation: number;
  unlinked: boolean;
}

interface FDStateEntry {
  position: number;
  append: boolean;
  syncMode: number;
  path: string;
  unlinked: boolean;
  generation: number;
  pendingOperations: number;
  closing: boolean;
  onDrained: ((info: FDCloseInfo) => void) | null;
}

export default class FDState {
  private static _states: {[fd: number]: FDStateEntry} = {};
  private static _leases: {[id: number]: FDStateEntry} = {};
  private static _nextGeneration: number = 1;
  private static _nextLeaseId: number = 1;

  public static open(
      fd: number,
      initialPosition: number,
      append: boolean = false,
      syncMode: number = 0,
      path: string = null): void {
    if (this._states[fd] !== undefined) {
      throw new Error(`File descriptor ${fd} is already registered.`);
    }
    this._states[fd] = {
      position: initialPosition,
      append: append,
      syncMode: syncMode,
      path: path,
      unlinked: false,
      generation: this._nextGeneration++,
      pendingOperations: 0,
      closing: false,
      onDrained: null
    };
  }

  public static getPos(fd: number): number {
    return this._states[fd].position;
  }

  public static getGeneration(fd: number): number {
    return this._states[fd].generation;
  }

  public static isCurrent(fd: number, generation: number): boolean {
    return this._states[fd] !== undefined &&
      !this._states[fd].closing &&
      this._states[fd].generation === generation;
  }

  public static acquireOperation(fd: number): FDOperationLease {
    const state = this._states[fd];
    if (state === undefined || state.closing) {
      return null;
    }
    const lease = {
      fd: fd,
      generation: state.generation,
      id: this._nextLeaseId++,
      released: false
    };
    state.pendingOperations++;
    this._leases[lease.id] = state;
    return lease;
  }

  public static releaseOperation(lease: FDOperationLease): void {
    if (lease === null || lease.released) {
      return;
    }
    lease.released = true;
    const state = this._leases[lease.id];
    delete this._leases[lease.id];
    if (state === undefined) {
      return;
    }
    if (state.pendingOperations <= 0) {
      throw new Error(`File descriptor ${lease.fd} operation lease underflow.`);
    }
    state.pendingOperations--;
    this._finishCloseIfDrained(lease.fd, state);
  }

  public static requestClose(
      fd: number,
      onDrained: (info: FDCloseInfo) => void): boolean {
    const state = this._states[fd];
    if (state === undefined) {
      onDrained({fd: fd, generation: 0, unlinked: false});
      return true;
    }
    if (state.closing) {
      return false;
    }
    state.closing = true;
    state.onDrained = onDrained;
    this._finishCloseIfDrained(fd, state);
    return true;
  }

  public static incrementPos(fd: number, incr: number): void {
    this._states[fd].position += incr;
  }

  public static incrementPosIfCurrent(
      fd: number,
      generation: number,
      incr: number): boolean {
    if (!this.isCurrent(fd, generation)) {
      return false;
    }
    this._states[fd].position += incr;
    return true;
  }

  public static setPos(fd: number, newPos: number): void {
    this._states[fd].position = newPos;
  }

  public static setPosIfCurrent(
      fd: number,
      generation: number,
      newPos: number): boolean {
    if (!this.isCurrent(fd, generation)) {
      return false;
    }
    this._states[fd].position = newPos;
    return true;
  }

  public static isAppend(fd: number): boolean {
    return this._states[fd] !== undefined && this._states[fd].append;
  }

  public static getSyncMode(fd: number): number {
    return this._states[fd] === undefined ? 0 : this._states[fd].syncMode;
  }

  public static markUnlinked(path: string): void {
    Object.keys(this._states).forEach((fd) => {
      const state = this._states[parseInt(fd, 10)];
      if (state.path === path) {
        state.unlinked = true;
      }
    });
  }

  public static isUnlinked(fd: number): boolean {
    return this._states[fd] !== undefined && this._states[fd].unlinked;
  }

  public static close(fd: number): void {
    delete this._states[fd];
  }

  private static _finishCloseIfDrained(fd: number, state: FDStateEntry): void {
    if (!state.closing || state.pendingOperations !== 0 || state.onDrained === null) {
      return;
    }
    const onDrained = state.onDrained;
    state.onDrained = null;
    if (this._states[fd] === state) {
      delete this._states[fd];
    }
    onDrained({
      fd: fd,
      generation: state.generation,
      unlinked: state.unlinked
    });
  }
}
