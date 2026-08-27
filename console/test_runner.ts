import {runTests, TestOptions, TestingError} from '../src/testing';
import * as os from 'os';
import * as fs from 'fs';
import * as path from 'path';
import * as JDKInfo from '../vendor/java_home/jdk.json';

// Makes our stack traces point to the TypeScript source code lines.
require('source-map-support').install({
  handleUncaughtExceptions: true
});

// Default options.
var opts: TestOptions = {
  doppioHomePath: path.resolve(__dirname, '..'),
  // Override default since we are in node.
  nativeClasspath: [],
  enableSystemAssertions: true,
  enableAssertions: true,
  intMode: false,
  dumpJITStats: false,
  tmpDir: os.tmpdir()
}, passChar: string, failChar: string;

if (process.platform.match(/win32/i)) {
  // Windows command prompt doesn't support Unicode characters.
  passChar = "√";
  failChar = "X";
} else {
  passChar = '✓';
  failChar = '✗';
}

/**
 * Makefile tests are only relevant to the native runner.
 */
function makefileTest(argv: any): void {
  var failpath = path.resolve(__dirname, '../classes/test/failures.txt'),
      keepGoing = argv.c;

  opts.testClasses = argv._;

  // Enter a domain so we are robust to uncaught errors.
  var errCallback: (err: any) => void = null;
  function finish(err?: TestingError) {
    // Print out the status of this test.
    process.stdout.write(err ? failChar : passChar);
    if (err) {
      var buff = new Buffer(`\n${err.message}\n`);
      fs.appendFileSync(failpath, buff, {
        flag: 'a'
      });
    }
    // Error code in the event of a failed test.
    process.exit(err ? 1 : 0);
  }

  // This handler should not run when the test exits normally (process.exit() in finish handler circumvents it).
  process.on('beforeExit', () => {
    if (errCallback) {
      errCallback(new Error('Finish callback never triggered.'));
    }
  });

  process.on('uncaughtException', (err: any) => {
    if (errCallback) {
      errCallback(err);
    }
  });

  runTests(opts, true, keepGoing, false, (cb: (err: Error) => void) => {
    errCallback = cb;
  }, finish);
}

function regularTest(argv: any): void {
  var hideDiffs = !argv.diff,
    quiet = argv.q,
    keepGoing = argv.c,
    errCallback: (err: any) => void = null;

  opts.testClasses = argv._;

  var stdoutW = process.stdout.write,
    stderrW = process.stderr.write;

  process.on('uncaughtException', (err: any) => {
    if (errCallback) {
      errCallback(err);
    }
  });

  // This handler should not run when the test exits normally (process.exit() in finish handler circumvents it).
  process.on('beforeExit', () => {
    if (errCallback) {
      errCallback(new Error('Finish callback never triggered.'));
    }
  });

  runTests(opts, quiet, keepGoing, hideDiffs, (cb: (err: Error) => void) => {
    errCallback = cb;
  }, (err?: TestingError) => {
    process.exit(err ? 1 : 0);
  });
}

var parsedArgs = require('util').parseArgs({
    args: process.argv.slice(2),
    options: {
      quiet: {type: 'boolean', short: 'q'},
      help: {type: 'boolean', short: 'h'},
      continue: {type: 'boolean', short: 'c'},
      // --makefile is only used from the makefile.
      makefile: {type: 'boolean'},
      diff: {type: 'boolean', default: true}
    },
    allowPositionals: true,
    allowNegative: true,
    // Accept unknown options for CLI compatibility while keeping them confined
    // to parseArgs' null-prototype values object.
    strict: false
  }),
  parsedValues = parsedArgs.values,
  argv: any = Object.create(null);

argv._ = parsedArgs.positionals;
argv.q = argv.quiet = parsedValues.quiet === undefined ? false : parsedValues.quiet;
argv.h = argv.help = parsedValues.help === undefined ? false : parsedValues.help;
argv.c = argv.continue = parsedValues.continue === undefined ? false : parsedValues.continue;
argv.makefile = parsedValues.makefile === undefined ? false : parsedValues.makefile;
argv.diff = parsedValues.diff;
if (argv.help) {
  process.stderr.write(
    `Usage: ${process.argv[0]} ${process.argv[1]} path/to/test [flags]\n\n` +
    'Options:\n' +
    '  -q, --quiet     Suppress in-progress test output\n' +
    '  --diff          Show failed test diff output      [default: true]\n' +
    '  -c, --continue  Keep going after test failure\n' +
    '  -h, --help      Show this usage\n'
  );
  process.exit(0);
}

if (argv.makefile) {
  makefileTest(argv);
} else {
  regularTest(argv);
}
