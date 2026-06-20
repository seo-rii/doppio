/// <reference types="grunt" />
/// <reference types="jasmine" />
/// <reference types="node" />

import type * as asyncTypes from 'async';
import type {ChildProcess} from 'child_process';

declare global {
  type AsyncFunction<T, E = Error> = asyncTypes.AsyncFunction<T, E>;
  type NodeBuffer = Buffer;
}

declare module 'child_process' {
  function exec(command: string, callback?: (error: any, stdout: any, stderr: any) => void): ChildProcess;
}

declare namespace grunt.task {
  interface ITask {
    options(): any;
  }

  interface IMultiTask<T> {
    files: any[];
  }
}

export {};
