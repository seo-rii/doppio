import child_process = require('child_process');
import os = require('os');
import async = require('async');

function unitTest(grunt: IGrunt) {
	grunt.registerMultiTask('unit_test', 'Run doppio unit tests.', function() {
    var files: { src: string[]; dest: string }[] = <any> this.files,
      done: (status?: boolean) => void = this.async(),
      tasks: Array<AsyncFunction<void>> = [], testFailed = false;
    // Delete failures.txt if it exists.
    if (grunt.file.exists('classes/test/failures.txt')) {
      grunt.file.delete('classes/test/failures.txt');
    }
    files.forEach(function(file: {src: string[]; dest: string}) {
      tasks.push(function(cb: (err?: any) => void) {
        // Strip '.java'
        var nameNoExt = file.src[0].slice(0, -5),
          cProcess = child_process.exec('node build/release-cli/console/test_runner.js ' + nameNoExt + ' --makefile', function (err?: any, stdout?: Buffer, stderr?: Buffer) {
          if (err) {
            grunt.log.write(stdout.toString() + stderr.toString());
            testFailed = true;
          } else {
            grunt.log.write(stdout.toString());
          }
          cb();
        });
      });
    });

    async.parallelLimit(tasks, os.cpus().length, function(err?: any) {
      // Force newline after test output.
      grunt.log.writeln('');
      if (grunt.file.exists('classes/test/failures.txt')) {
        grunt.log.writeln(grunt.file.read('classes/test/failures.txt'));
      }
      done(!testFailed);
    });
  });

  grunt.registerTask('unit_test_nashorn_legacy', 'Run the bundled Nashorn compatibility smoke only on Doppio.', function() {
    var done: (status?: boolean) => void = this.async(),
      runnerPath = 'build/release-cli/console/runner.js',
      expectedPath = 'classes/test/NashornTest.expected';
    if (!grunt.file.exists(runnerPath) || !grunt.file.exists(expectedPath)) {
      grunt.log.error('Build the release CLI and keep the Nashorn expected output before running this smoke.');
      return done(false);
    }
    child_process.execFile(process.execPath, [runnerPath, 'classes.test.NashornTest'], {
      encoding: 'utf8',
      env: Object.assign({}, process.env, {NODE_NO_WARNINGS: '1'})
    }, function(err?: any, stdout?: string, stderr?: string) {
      var actual = stdout.replace(/\r\n?/g, '\n'),
        expected = grunt.file.read(expectedPath).replace(/\r\n?/g, '\n');
      if (err || stderr.length > 0) {
        grunt.log.error('Bundled Nashorn smoke failed to run.');
        grunt.log.write(actual + stderr);
        return done(false);
      }
      if (actual !== expected) {
        grunt.log.error('Bundled Nashorn output did not match its Doppio-only golden.');
        grunt.log.writeln('Doppio:\n' + actual + 'Expected:\n' + expected);
        return done(false);
      }
      grunt.log.ok('Bundled Nashorn output matched its Doppio-only golden.');
      done();
    });
  });
}

export = unitTest;
