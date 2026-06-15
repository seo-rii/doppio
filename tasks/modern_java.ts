import child_process = require('child_process');
import os = require('os');
import fs = require('fs');
import async = require('async');
import path = require('path');

function shellEscape(str: string): string {
  return "'" + str.replace(/'/g, "'\\''") + "'";
}

function modernJava(grunt: IGrunt) {
  function generateEmptyClass(className: string, majorVersion: number): Buffer {
    var bytes: number[] = [];

    function u1(value: number): void {
      bytes.push(value & 0xff);
    }

    function u2(value: number): void {
      bytes.push((value >>> 8) & 0xff, value & 0xff);
    }

    function u4(value: number): void {
      bytes.push((value >>> 24) & 0xff, (value >>> 16) & 0xff, (value >>> 8) & 0xff, value & 0xff);
    }

    function utf8(value: string): void {
      var buf = Buffer.from(value, 'utf8');
      u1(1);
      u2(buf.length);
      for (var i = 0; i < buf.length; i++) {
        u1(buf[i]);
      }
    }

    function cls(nameIndex: number): void {
      u1(7);
      u2(nameIndex);
    }

    function nameAndType(nameIndex: number, descriptorIndex: number): void {
      u1(12);
      u2(nameIndex);
      u2(descriptorIndex);
    }

    function ref(tag: number, classIndex: number, nameAndTypeIndex: number): void {
      u1(tag);
      u2(classIndex);
      u2(nameAndTypeIndex);
    }

    function codeAttr(code: number[], maxStack: number, maxLocals: number): void {
      u2(7);
      u4(12 + code.length);
      u2(maxStack);
      u2(maxLocals);
      u4(code.length);
      code.forEach(u1);
      u2(0);
      u2(0);
    }

    u4(0xcafebabe);
    u2(0);
    u2(majorVersion);
    u2(10);
    cls(2);
    utf8(className);
    cls(4);
    utf8('java/lang/Object');
    utf8('<init>');
    utf8('()V');
    utf8('Code');
    ref(10, 3, 9);
    nameAndType(5, 6);

    u2(0x0021);
    u2(1);
    u2(4);
    u2(0);
    u2(0);
    u2(1);
    u2(0x0001);
    u2(4);
    u2(6);
    u2(1);
    codeAttr([0x2a, 0xb7, 0x00, 0x08, 0xb1], 1, 1);
    u2(0);

    return Buffer.from(bytes);
  }

  grunt.registerTask('generate_modern_classfile_versions', 'Generate simple Java 18+ class-file container fixtures.', function() {
    [
      ['classes/modern_test/Java18ClassFileVersion.class', 'classes/modern_test/Java18ClassFileVersion', 62],
      ['classes/modern_test/Java19ClassFileVersion.class', 'classes/modern_test/Java19ClassFileVersion', 63],
      ['classes/modern_test/Java20ClassFileVersion.class', 'classes/modern_test/Java20ClassFileVersion', 64],
      ['classes/modern_test/Java21ClassFileVersion.class', 'classes/modern_test/Java21ClassFileVersion', 65],
      ['classes/modern_test/Java22ClassFileVersion.class', 'classes/modern_test/Java22ClassFileVersion', 66],
      ['classes/modern_test/Java23ClassFileVersion.class', 'classes/modern_test/Java23ClassFileVersion', 67],
      ['classes/modern_test/Java24ClassFileVersion.class', 'classes/modern_test/Java24ClassFileVersion', 68],
      ['classes/modern_test/Java25ClassFileVersion.class', 'classes/modern_test/Java25ClassFileVersion', 69],
      ['classes/modern_test/Java26ClassFileVersion.class', 'classes/modern_test/Java26ClassFileVersion', 70]
    ].forEach(function(spec: [string, string, number]) {
      grunt.file.write(spec[0], generateEmptyClass(spec[1], spec[2]));
      grunt.log.ok('Generated ' + spec[0]);
    });
  });

  grunt.registerTask('generate_java18_unsigned_multiply_high', 'Generate a Java 18 Math.unsignedMultiplyHigh fixture.', function() {
    var bytes: number[] = [],
      outPath = 'classes/modern_test/Java18UnsignedMultiplyHigh.class',
      runoutPath = 'classes/modern_test/Java18UnsignedMultiplyHigh.runout',
      expectedOutput = [
        '0',
        '1',
        '-2',
        '1',
        '4611686018427387904',
        '81662756506307415',
        '921554509310949085',
        '0',
        '1',
        '-2',
        '1',
        '4611686018427387904',
        '81662756506307415',
        '921554509310949085'
      ].join('\n') + '\n';

    function u1(value: number): void {
      bytes.push(value & 0xff);
    }

    function u2(value: number): void {
      bytes.push((value >>> 8) & 0xff, value & 0xff);
    }

    function u4(value: number): void {
      bytes.push((value >>> 24) & 0xff, (value >>> 16) & 0xff, (value >>> 8) & 0xff, value & 0xff);
    }

    function utf8(value: string): void {
      var buf = Buffer.from(value, 'utf8');
      u1(1);
      u2(buf.length);
      for (var i = 0; i < buf.length; i++) {
        u1(buf[i]);
      }
    }

    function cls(nameIndex: number): void {
      u1(7);
      u2(nameIndex);
    }

    function nameAndType(nameIndex: number, descriptorIndex: number): void {
      u1(12);
      u2(nameIndex);
      u2(descriptorIndex);
    }

    function ref(tag: number, classIndex: number, nameAndTypeIndex: number): void {
      u1(tag);
      u2(classIndex);
      u2(nameAndTypeIndex);
    }

    function longConst(high: number, low: number): void {
      u1(5);
      u4(high);
      u4(low);
    }

    function emitPrint(code: number[], methodRef: number, leftIndex: number, rightIndex: number): void {
      code.push(0xb2, 0x00, 0x0e);
      code.push(0x14, (leftIndex >>> 8) & 0xff, leftIndex & 0xff);
      code.push(0x14, (rightIndex >>> 8) & 0xff, rightIndex & 0xff);
      code.push(0xb8, (methodRef >>> 8) & 0xff, methodRef & 0xff);
      code.push(0xb6, 0x00, 0x14);
    }

    function codeAttr(code: number[], maxStack: number, maxLocals: number): void {
      u2(7);
      u4(12 + code.length);
      u2(maxStack);
      u2(maxLocals);
      u4(code.length);
      code.forEach(u1);
      u2(0);
      u2(0);
    }

    var mainCode: number[] = [],
      cases: number[][] = [
        [33, 35],
        [37, 37],
        [39, 39],
        [41, 43],
        [41, 41],
        [45, 47],
        [49, 51]
      ];

    cases.forEach(function(spec: number[]): void {
      emitPrint(mainCode, 26, spec[0], spec[1]);
    });
    cases.forEach(function(spec: number[]): void {
      emitPrint(mainCode, 32, spec[0], spec[1]);
    });
    mainCode.push(0xb1);

    u4(0xcafebabe);
    u2(0);
    u2(62);
    u2(53);
    cls(2);
    utf8('classes/modern_test/Java18UnsignedMultiplyHigh');
    cls(4);
    utf8('java/lang/Object');
    utf8('<init>');
    utf8('()V');
    utf8('Code');
    ref(10, 3, 9);
    nameAndType(5, 6);
    utf8('main');
    utf8('([Ljava/lang/String;)V');
    cls(13);
    utf8('java/lang/System');
    ref(9, 12, 15);
    nameAndType(16, 17);
    utf8('out');
    utf8('Ljava/io/PrintStream;');
    cls(19);
    utf8('java/io/PrintStream');
    ref(10, 18, 21);
    nameAndType(22, 23);
    utf8('println');
    utf8('(J)V');
    cls(25);
    utf8('java/lang/Math');
    ref(10, 24, 27);
    nameAndType(28, 29);
    utf8('unsignedMultiplyHigh');
    utf8('(JJ)J');
    cls(31);
    utf8('java/lang/StrictMath');
    ref(10, 30, 27);
    longConst(0, 0);
    longConst(0, 123);
    longConst(1, 0);
    longConst(-1, -1);
    longConst(-2147483648, 0);
    longConst(0, 2);
    longConst(0x01234567, 0x89abcdef);
    longConst(-16909061, -84281096);
    longConst(-287445237, -2112454933);
    longConst(229956191, 1241035896);

    u2(0x0021);
    u2(1);
    u2(3);
    u2(0);
    u2(0);
    u2(2);
    u2(0x0001);
    u2(5);
    u2(6);
    u2(1);
    codeAttr([0x2a, 0xb7, 0x00, 0x08, 0xb1], 1, 1);
    u2(0x0009);
    u2(10);
    u2(11);
    u2(1);
    codeAttr(mainCode, 5, 1);
    u2(0);

    grunt.file.write(outPath, Buffer.from(bytes));
    grunt.log.ok('Generated ' + outPath);
    grunt.file.write(runoutPath, expectedOutput);
    grunt.log.ok('Generated ' + runoutPath);
  });

  grunt.registerTask('generate_java18_default_charset', 'Generate a Java 18 UTF-8 default charset fixture.', function() {
    var done: (status?: boolean) => void = this.async(),
      sourcePath = 'classes/modern_test/Java18DefaultCharset.java',
      classPath = 'classes/modern_test/Java18DefaultCharset.class',
      runoutPath = 'classes/modern_test/Java18DefaultCharset.runout',
      expectedOutput = [
        'UTF-8',
        'UTF-8',
        '2',
        'e9:20ac',
        '[-61, -87, -30, -126, -84]',
        '2:e9:20ac',
        '[-61, -87, -30, -126, -84]'
      ].join('\n') + '\n';

    grunt.config.requires('build.javac');
    child_process.exec(shellEscape(grunt.config('build.javac')) + ' -J-Dfile.encoding=UTF8 --release 17 -d . ' + shellEscape(sourcePath),
      function(err?: any, stdout?: Buffer, stderr?: Buffer) {
        if (err) {
          grunt.fail.fatal('Error compiling Java 18 default charset fixture: ' + err + '\n' + stdout.toString() + stderr.toString());
        }
        var classData = fs.readFileSync(classPath);
        classData[6] = 0;
        classData[7] = 62;
        fs.writeFileSync(classPath, classData);
        fs.writeFileSync(runoutPath, expectedOutput);
        grunt.log.ok('Generated ' + classPath);
        grunt.log.ok('Generated ' + runoutPath);
        done();
      });
  });

  grunt.registerTask('generate_return_top_modern', 'Generate a fixture where return values are above unused operand-stack entries.', function() {
    var bytes: number[] = [],
      outPath = 'classes/modern_test/ReturnTopOfStackGenerated.class';

    function u1(value: number): void {
      bytes.push(value & 0xff);
    }

    function u2(value: number): void {
      bytes.push((value >>> 8) & 0xff, value & 0xff);
    }

    function u4(value: number): void {
      bytes.push((value >>> 24) & 0xff, (value >>> 16) & 0xff, (value >>> 8) & 0xff, value & 0xff);
    }

    function utf8(value: string): void {
      var buf = Buffer.from(value, 'utf8');
      u1(1);
      u2(buf.length);
      for (var i = 0; i < buf.length; i++) {
        u1(buf[i]);
      }
    }

    function cls(nameIndex: number): void {
      u1(7);
      u2(nameIndex);
    }

    function nameAndType(nameIndex: number, descriptorIndex: number): void {
      u1(12);
      u2(nameIndex);
      u2(descriptorIndex);
    }

    function ref(tag: number, classIndex: number, nameAndTypeIndex: number): void {
      u1(tag);
      u2(classIndex);
      u2(nameAndTypeIndex);
    }

    function longConstant(value: number): void {
      var high = Math.floor(value / 0x100000000),
        low = value >>> 0;
      u1(5);
      u4(high);
      u4(low);
    }

    function codeAttr(code: number[], maxStack: number, maxLocals: number): void {
      u2(7);
      u4(12 + code.length);
      u2(maxStack);
      u2(maxLocals);
      u4(code.length);
      code.forEach(u1);
      u2(0);
      u2(0);
    }

    u4(0xcafebabe);
    u2(0);
    u2(52);
    u2(16);
    cls(2);
    utf8('classes/modern_test/ReturnTopOfStackGenerated');
    cls(4);
    utf8('java/lang/Object');
    utf8('<init>');
    utf8('()V');
    utf8('Code');
    ref(10, 3, 9);
    nameAndType(5, 6);
    utf8('nullWithJunk');
    utf8('()Ljava/lang/Object;');
    utf8('longWithJunk');
    utf8('()J');
    longConstant(123456789);

    u2(0x0021);
    u2(1);
    u2(3);
    u2(0);
    u2(0);
    u2(3);
    u2(0x0001);
    u2(5);
    u2(6);
    u2(1);
    codeAttr([0x2a, 0xb7, 0x00, 0x08, 0xb1], 1, 1);
    u2(0x0009);
    u2(10);
    u2(11);
    u2(1);
    codeAttr([0xbb, 0x00, 0x03, 0x59, 0x01, 0xb0], 3, 0);
    u2(0x0009);
    u2(12);
    u2(13);
    u2(1);
    codeAttr([0xbb, 0x00, 0x03, 0x59, 0x14, 0x00, 0x0e, 0xad], 4, 0);
    u2(0);

    grunt.file.write(outPath, Buffer.from(bytes));
    grunt.log.ok('Generated ' + outPath);
  });

  grunt.registerTask('generate_null_type_checks_modern', 'Generate null checkcast/instanceof fixtures with missing target classes.', function() {
    var bytes: number[] = [],
      outPath = 'classes/modern_test/Java9NullTypeChecksGenerated.class';

    function u1(value: number): void {
      bytes.push(value & 0xff);
    }

    function u2(value: number): void {
      bytes.push((value >>> 8) & 0xff, value & 0xff);
    }

    function u4(value: number): void {
      bytes.push((value >>> 24) & 0xff, (value >>> 16) & 0xff, (value >>> 8) & 0xff, value & 0xff);
    }

    function utf8(value: string): void {
      var buf = Buffer.from(value, 'utf8');
      u1(1);
      u2(buf.length);
      for (var i = 0; i < buf.length; i++) {
        u1(buf[i]);
      }
    }

    function cls(nameIndex: number): void {
      u1(7);
      u2(nameIndex);
    }

    function nameAndType(nameIndex: number, descriptorIndex: number): void {
      u1(12);
      u2(nameIndex);
      u2(descriptorIndex);
    }

    function ref(tag: number, classIndex: number, nameAndTypeIndex: number): void {
      u1(tag);
      u2(classIndex);
      u2(nameAndTypeIndex);
    }

    function codeAttr(code: number[], maxStack: number, maxLocals: number): void {
      u2(7);
      u4(12 + code.length);
      u2(maxStack);
      u2(maxLocals);
      u4(code.length);
      code.forEach(u1);
      u2(0);
      u2(0);
    }

    u4(0xcafebabe);
    u2(0);
    u2(52);
    u2(16);
    cls(2);
    utf8('classes/modern_test/Java9NullTypeChecksGenerated');
    cls(4);
    utf8('java/lang/Object');
    utf8('<init>');
    utf8('()V');
    utf8('Code');
    ref(10, 3, 9);
    nameAndType(5, 6);
    utf8('nullCheckcast');
    utf8('()Ljava/lang/Object;');
    utf8('nullInstanceOf');
    utf8('()Z');
    cls(15);
    utf8('missing/NoSuchType');

    u2(0x0021);
    u2(1);
    u2(3);
    u2(0);
    u2(0);
    u2(3);
    u2(0x0001);
    u2(5);
    u2(6);
    u2(1);
    codeAttr([0x2a, 0xb7, 0x00, 0x08, 0xb1], 1, 1);
    u2(0x0009);
    u2(10);
    u2(11);
    u2(1);
    codeAttr([0x01, 0xc0, 0x00, 0x0e, 0xb0], 1, 0);
    u2(0x0009);
    u2(12);
    u2(13);
    u2(1);
    codeAttr([0x01, 0xc1, 0x00, 0x0e, 0xac], 1, 0);
    u2(0);

    grunt.file.write(outPath, Buffer.from(bytes));
    grunt.log.ok('Generated ' + outPath);
  });

  grunt.registerTask('generate_illegal_sealed_modern', 'Generate a Java 17 sealed-class violation fixture.', function() {
    var bytes: number[] = [],
      outPath = 'classes/modern_test/Java17SealedClassVersion$Triangle.class';

    function u1(value: number): void {
      bytes.push(value & 0xff);
    }

    function u2(value: number): void {
      bytes.push((value >>> 8) & 0xff, value & 0xff);
    }

    function u4(value: number): void {
      bytes.push((value >>> 24) & 0xff, (value >>> 16) & 0xff, (value >>> 8) & 0xff, value & 0xff);
    }

    function utf8(value: string): void {
      var buf = Buffer.from(value, 'utf8');
      u1(1);
      u2(buf.length);
      for (var i = 0; i < buf.length; i++) {
        u1(buf[i]);
      }
    }

    function cls(nameIndex: number): void {
      u1(7);
      u2(nameIndex);
    }

    function string(utf8Index: number): void {
      u1(8);
      u2(utf8Index);
    }

    function nameAndType(nameIndex: number, descriptorIndex: number): void {
      u1(12);
      u2(nameIndex);
      u2(descriptorIndex);
    }

    function ref(tag: number, classIndex: number, nameAndTypeIndex: number): void {
      u1(tag);
      u2(classIndex);
      u2(nameAndTypeIndex);
    }

    function codeAttr(code: number[], maxStack: number, maxLocals: number): void {
      u2(9);
      u4(12 + code.length);
      u2(maxStack);
      u2(maxLocals);
      u4(code.length);
      code.forEach(u1);
      u2(0);
      u2(0);
    }

    u4(0xcafebabe);
    u2(0);
    u2(61);
    u2(18);

    cls(2);
    utf8('classes/modern_test/Java17SealedClassVersion$Triangle');
    cls(4);
    utf8('java/lang/Object');
    cls(6);
    utf8('classes/modern_test/Java17SealedClassVersion$Shape');
    utf8('<init>');
    utf8('()V');
    utf8('Code');
    ref(10, 3, 11);
    nameAndType(7, 8);
    utf8('name');
    utf8('()Ljava/lang/String;');
    utf8('triangle');
    string(14);
    utf8('sides');
    utf8('()I');

    u2(0x0031);
    u2(1);
    u2(3);
    u2(1);
    u2(5);
    u2(0);
    u2(3);

    u2(0x0001);
    u2(7);
    u2(8);
    u2(1);
    codeAttr([0x2a, 0xb7, 0x00, 0x0a, 0xb1], 1, 1);

    u2(0x0001);
    u2(12);
    u2(13);
    u2(1);
    codeAttr([0x12, 0x0f, 0xb0], 1, 1);

    u2(0x0001);
    u2(16);
    u2(17);
    u2(1);
    codeAttr([0x06, 0xac], 1, 1);

    u2(0);

    grunt.file.write(outPath, Buffer.from(bytes));
    grunt.log.ok('Generated ' + outPath);

  });

  grunt.registerTask('generate_string_concat_constants_modern', 'Generate Java 9 StringConcatFactory constant recipe fixture.', function() {
    var bytes: number[] = [],
      outPath = 'classes/modern_test/Java9StringConcatConstants.class';

    function u1(value: number): void {
      bytes.push(value & 0xff);
    }

    function u2(value: number): void {
      bytes.push((value >>> 8) & 0xff, value & 0xff);
    }

    function u4(value: number): void {
      bytes.push((value >>> 24) & 0xff, (value >>> 16) & 0xff, (value >>> 8) & 0xff, value & 0xff);
    }

    function utf8(value: string): void {
      var buf = Buffer.from(value, 'utf8');
      u1(1);
      u2(buf.length);
      for (var i = 0; i < buf.length; i++) {
        u1(buf[i]);
      }
    }

    function cls(nameIndex: number): void {
      u1(7);
      u2(nameIndex);
    }

    function string(utf8Index: number): void {
      u1(8);
      u2(utf8Index);
    }

    function int32(value: number): void {
      u1(3);
      u4(value);
    }

    function nameAndType(nameIndex: number, descriptorIndex: number): void {
      u1(12);
      u2(nameIndex);
      u2(descriptorIndex);
    }

    function ref(tag: number, classIndex: number, nameAndTypeIndex: number): void {
      u1(tag);
      u2(classIndex);
      u2(nameAndTypeIndex);
    }

    function methodHandle(refKind: number, refIndex: number): void {
      u1(15);
      u1(refKind);
      u2(refIndex);
    }

    function methodType(descriptorIndex: number): void {
      u1(16);
      u2(descriptorIndex);
    }

    function invokeDynamic(bootstrapIndex: number, nameAndTypeIndex: number): void {
      u1(18);
      u2(bootstrapIndex);
      u2(nameAndTypeIndex);
    }

    function codeAttr(code: number[], maxStack: number, maxLocals: number): void {
      u2(7);
      u4(12 + code.length);
      u2(maxStack);
      u2(maxLocals);
      u4(code.length);
      code.forEach(u1);
      u2(0);
      u2(0);
    }

    u4(0xcafebabe);
    u2(0);
    u2(53);
    u2(53);

    cls(2);
    utf8('classes/modern_test/Java9StringConcatConstants');
    cls(4);
    utf8('java/lang/Object');
    utf8('<init>');
    utf8('()V');
    utf8('Code');
    ref(10, 3, 9);
    nameAndType(5, 6);
    ref(9, 11, 13);
    cls(12);
    utf8('java/lang/System');
    nameAndType(14, 15);
    utf8('out');
    utf8('Ljava/io/PrintStream;');
    ref(10, 17, 19);
    cls(18);
    utf8('java/io/PrintStream');
    nameAndType(20, 21);
    utf8('println');
    utf8('(Ljava/lang/String;)V');
    invokeDynamic(0, 23);
    nameAndType(24, 25);
    utf8('makeConcatWithConstants');
    utf8('()Ljava/lang/String;');
    utf8('BootstrapMethods');
    methodHandle(6, 28);
    ref(10, 29, 31);
    cls(30);
    utf8('java/lang/invoke/StringConcatFactory');
    nameAndType(24, 32);
    utf8('(Ljava/lang/invoke/MethodHandles$Lookup;Ljava/lang/String;Ljava/lang/invoke/MethodType;Ljava/lang/String;[Ljava/lang/Object;)Ljava/lang/invoke/CallSite;');
    string(34);
    utf8('class=\u0002,int=\u0002,string=\u0002,interface=\u0002,array=\u0002,methodType=\u0002,methodHandle=\u0002');
    cls(36);
    utf8('java/lang/String');
    int32(42);
    string(39);
    utf8('ok');
    cls(41);
    utf8('java/lang/Runnable');
    cls(43);
    utf8('[Ljava/lang/String;');
    methodType(45);
    utf8('(Ljava/lang/String;)I');
    methodHandle(6, 50);
    utf8('valueOf');
    utf8('(I)Ljava/lang/String;');
    nameAndType(47, 48);
    ref(10, 35, 49);
    utf8('main');
    utf8('([Ljava/lang/String;)V');

    u2(0x0021);
    u2(1);
    u2(3);
    u2(0);
    u2(0);
    u2(2);

    u2(0x0001);
    u2(5);
    u2(6);
    u2(1);
    codeAttr([0x2a, 0xb7, 0x00, 0x08, 0xb1], 1, 1);

    u2(0x0009);
    u2(51);
    u2(52);
    u2(1);
    codeAttr([0xb2, 0x00, 0x0a, 0xba, 0x00, 0x16, 0x00, 0x00, 0xb6, 0x00, 0x10, 0xb1], 2, 1);

    u2(1);
    u2(26);
    u4(22);
    u2(1);
    u2(27);
    u2(8);
    u2(33);
    u2(35);
    u2(37);
    u2(38);
    u2(40);
    u2(42);
    u2(44);
    u2(46);

    grunt.file.write(outPath, Buffer.from(bytes));
    grunt.log.ok('Generated ' + outPath);
  });

  grunt.registerTask('generate_constant_dynamic_modern', 'Generate Java 11 CONSTANT_Dynamic fixture class.', function() {
    var outPath = 'classes/modern_test/Java11ConstantDynamic.class',
      bytes: number[] = [];

    function u1(value: number): void {
      bytes.push(value & 0xff);
    }

    function u2(value: number): void {
      bytes.push((value >>> 8) & 0xff, value & 0xff);
    }

    function u4(value: number): void {
      bytes.push((value >>> 24) & 0xff, (value >>> 16) & 0xff, (value >>> 8) & 0xff, value & 0xff);
    }

    function utf8(value: string): void {
      var buf = Buffer.from(value, 'utf8');
      u1(1);
      u2(buf.length);
      for (var i = 0; i < buf.length; i++) {
        u1(buf[i]);
      }
    }

    function int32(value: number): void {
      u1(3);
      u4(value);
    }

    function int64(highBytes: number, lowBytes: number): void {
      u1(5);
      u4(highBytes);
      u4(lowBytes);
    }

    function float32(value: number): void {
      var buf = Buffer.alloc(4);
      buf.writeFloatBE(value, 0);
      u1(4);
      for (var i = 0; i < buf.length; i++) {
        u1(buf[i]);
      }
    }

    function double64(value: number): void {
      var buf = Buffer.alloc(8);
      buf.writeDoubleBE(value, 0);
      u1(6);
      for (var i = 0; i < buf.length; i++) {
        u1(buf[i]);
      }
    }

    function cls(nameIndex: number): void {
      u1(7);
      u2(nameIndex);
    }

    function nameAndType(nameIndex: number, descriptorIndex: number): void {
      u1(12);
      u2(nameIndex);
      u2(descriptorIndex);
    }

    function ref(tag: number, classIndex: number, nameAndTypeIndex: number): void {
      u1(tag);
      u2(classIndex);
      u2(nameAndTypeIndex);
    }

    function methodHandle(kind: number, referenceIndex: number): void {
      u1(15);
      u1(kind);
      u2(referenceIndex);
    }

    function string(utf8Index: number): void {
      u1(8);
      u2(utf8Index);
    }

    function dynamic(bootstrapMethodIndex: number, nameAndTypeIndex: number): void {
      u1(17);
      u2(bootstrapMethodIndex);
      u2(nameAndTypeIndex);
    }

    function codeAttr(code: number[], maxStack: number, maxLocals: number): void {
      u2(7);
      u4(12 + code.length);
      u2(maxStack);
      u2(maxLocals);
      u4(code.length);
      code.forEach(u1);
      u2(0);
      u2(0);
    }

    u4(0xcafebabe);
    u2(0);
    u2(55);
    u2(36);

    cls(2);
    utf8('classes/modern_test/Java11ConstantDynamic');
    cls(4);
    utf8('java/lang/Object');
    utf8('<init>');
    utf8('()V');
    utf8('Code');
    ref(10, 3, 9);
    nameAndType(5, 6);
    utf8('main');
    utf8('([Ljava/lang/String;)V');
    utf8('java/lang/System');
    cls(12);
    utf8('out');
    utf8('Ljava/io/PrintStream;');
    nameAndType(14, 15);
    ref(9, 13, 16);
    utf8('java/io/PrintStream');
    cls(18);
    utf8('println');
    utf8('(Ljava/lang/String;)V');
    nameAndType(20, 21);
    ref(10, 19, 22);
    utf8('BootstrapMethods');
    utf8('java/lang/invoke/ConstantBootstraps');
    cls(25);
    utf8('nullConstant');
    utf8('(Ljava/lang/invoke/MethodHandles$Lookup;Ljava/lang/String;Ljava/lang/Class;)Ljava/lang/Object;');
    nameAndType(27, 28);
    ref(10, 26, 29);
    methodHandle(6, 30);
    utf8('dynamicValue');
    utf8('Ljava/lang/String;');
    nameAndType(32, 33);
    dynamic(0, 34);

    u2(0x0021);
    u2(1);
    u2(3);
    u2(0);
    u2(0);
    u2(2);

    u2(0x0001);
    u2(5);
    u2(6);
    u2(1);
    codeAttr([0x2a, 0xb7, 0x00, 0x08, 0xb1], 1, 1);

    u2(0x0009);
    u2(10);
    u2(11);
    u2(1);
    codeAttr([0xb2, 0x00, 0x11, 0x13, 0x00, 0x23, 0xb6, 0x00, 0x17, 0xb1], 2, 1);

    u2(1);
    u2(24);
    u4(6);
    u2(1);
    u2(31);
    u2(0);

    grunt.file.write(outPath, Buffer.from(bytes));
    grunt.log.ok('Generated ' + outPath);

    outPath = 'classes/modern_test/Java11ConstantDynamicMore.class';
    bytes = [];

    u4(0xcafebabe);
    u2(0);
    u2(55);
    u2(138);

    cls(2);
    utf8('classes/modern_test/Java11ConstantDynamicMore');
    cls(4);
    utf8('java/lang/Object');
    utf8('<init>');
    utf8('()V');
    utf8('Code');
    ref(10, 3, 9);
    nameAndType(5, 6);
    utf8('main');
    utf8('([Ljava/lang/String;)V');
    utf8('java/lang/System');
    cls(12);
    utf8('out');
    utf8('Ljava/io/PrintStream;');
    nameAndType(14, 15);
    ref(9, 13, 16);
    utf8('java/io/PrintStream');
    cls(18);
    utf8('println');
    utf8('(Ljava/lang/String;)V');
    nameAndType(20, 21);
    ref(10, 19, 22);
    utf8('java/lang/Class');
    cls(24);
    utf8('getName');
    utf8('()Ljava/lang/String;');
    nameAndType(26, 27);
    ref(10, 25, 28);
    utf8('BootstrapMethods');
    utf8('java/lang/invoke/ConstantBootstraps');
    cls(31);
    utf8('primitiveClass');
    utf8('(Ljava/lang/invoke/MethodHandles$Lookup;Ljava/lang/String;Ljava/lang/Class;)Ljava/lang/Class;');
    nameAndType(33, 34);
    ref(10, 32, 35);
    methodHandle(6, 36);
    utf8('I');
    utf8('Ljava/lang/Class;');
    nameAndType(38, 39);
    dynamic(0, 40);
    utf8('classes/modern_test/Java11ConstantDynamicMore$Support$Choice');
    cls(42);
    utf8('enumConstant');
    utf8('(Ljava/lang/invoke/MethodHandles$Lookup;Ljava/lang/String;Ljava/lang/Class;)Ljava/lang/Enum;');
    nameAndType(44, 45);
    ref(10, 32, 46);
    methodHandle(6, 47);
    utf8('BETA');
    utf8('Lclasses/modern_test/Java11ConstantDynamicMore$Support$Choice;');
    nameAndType(49, 50);
    dynamic(1, 51);
    utf8('java/lang/Enum');
    cls(53);
    utf8('name');
    nameAndType(55, 27);
    ref(10, 54, 56);
    utf8('getStaticFinal');
    utf8('(Ljava/lang/invoke/MethodHandles$Lookup;Ljava/lang/String;Ljava/lang/Class;Ljava/lang/Class;)Ljava/lang/Object;');
    nameAndType(58, 59);
    ref(10, 32, 60);
    methodHandle(6, 61);
    utf8('classes/modern_test/Java11ConstantDynamicMore$Support');
    cls(63);
    utf8('MESSAGE');
    utf8('Ljava/lang/String;');
    nameAndType(65, 66);
    dynamic(2, 67);
    utf8('explicitCast');
    utf8('(Ljava/lang/invoke/MethodHandles$Lookup;Ljava/lang/String;Ljava/lang/Class;Ljava/lang/Object;)Ljava/lang/Object;');
    nameAndType(69, 70);
    ref(10, 32, 71);
    methodHandle(6, 72);
    utf8('casted');
    string(74);
    utf8('castedValue');
    nameAndType(76, 66);
    dynamic(3, 77);
    utf8('(I)V');
    nameAndType(20, 79);
    ref(10, 19, 80);
    int32(42);
    utf8('castedInt');
    nameAndType(83, 38);
    dynamic(4, 84);
    utf8('(J)V');
    nameAndType(20, 86);
    ref(10, 19, 87);
    int64(0x0000011f, 0x71fb04cb);
    utf8('castedLong');
    utf8('J');
    nameAndType(91, 92);
    dynamic(5, 93);
    utf8('(D)V');
    nameAndType(20, 95);
    ref(10, 19, 96);
    double64(6.25);
    utf8('castedDouble');
    utf8('D');
    nameAndType(100, 101);
    dynamic(6, 102);
    utf8('(F)V');
    nameAndType(20, 104);
    ref(10, 19, 105);
    float32(3.5);
    utf8('castedFloat');
    utf8('F');
    nameAndType(108, 109);
    dynamic(7, 110);
    utf8('(Z)V');
    nameAndType(20, 112);
    ref(10, 19, 113);
    int32(3);
    utf8('castedBoolean');
    utf8('Z');
    nameAndType(116, 117);
    dynamic(8, 118);
    utf8('(C)V');
    nameAndType(20, 120);
    ref(10, 19, 121);
    int32(65);
    utf8('castedChar');
    utf8('C');
    nameAndType(124, 125);
    dynamic(9, 126);
    int32(130);
    utf8('castedByte');
    utf8('B');
    nameAndType(129, 130);
    dynamic(10, 131);
    int32(32769);
    utf8('castedShort');
    utf8('S');
    nameAndType(134, 135);
    dynamic(11, 136);

    u2(0x0021);
    u2(1);
    u2(3);
    u2(0);
    u2(0);
    u2(2);

    u2(0x0001);
    u2(5);
    u2(6);
    u2(1);
    codeAttr([0x2a, 0xb7, 0x00, 0x08, 0xb1], 1, 1);

    u2(0x0009);
    u2(10);
    u2(11);
    u2(1);
    codeAttr([
      0xb2, 0x00, 0x11,
      0x13, 0x00, 0x29,
      0xb6, 0x00, 0x1d,
      0xb6, 0x00, 0x17,
      0xb2, 0x00, 0x11,
      0x13, 0x00, 0x34,
      0xb6, 0x00, 0x39,
      0xb6, 0x00, 0x17,
      0xb2, 0x00, 0x11,
      0x13, 0x00, 0x44,
      0xb6, 0x00, 0x17,
      0xb2, 0x00, 0x11,
      0x13, 0x00, 0x4e,
      0xb6, 0x00, 0x17,
      0xb2, 0x00, 0x11,
      0x13, 0x00, 0x55,
      0xb6, 0x00, 0x51,
      0xb2, 0x00, 0x11,
      0x14, 0x00, 0x5e,
      0xb6, 0x00, 0x58,
      0xb2, 0x00, 0x11,
      0x14, 0x00, 0x67,
      0xb6, 0x00, 0x61,
      0xb2, 0x00, 0x11,
      0x13, 0x00, 0x6f,
      0xb6, 0x00, 0x6a,
      0xb2, 0x00, 0x11,
      0x13, 0x00, 0x77,
      0xb6, 0x00, 0x72,
      0xb2, 0x00, 0x11,
      0x13, 0x00, 0x7f,
      0xb6, 0x00, 0x7a,
      0xb2, 0x00, 0x11,
      0x13, 0x00, 0x84,
      0xb6, 0x00, 0x51,
      0xb2, 0x00, 0x11,
      0x13, 0x00, 0x89,
      0xb6, 0x00, 0x51,
      0xb1
    ], 3, 1);

    u2(1);
    u2(30);
    u4(70);
    u2(12);
    u2(37);
    u2(0);
    u2(48);
    u2(0);
    u2(62);
    u2(1);
    u2(64);
    u2(73);
    u2(1);
    u2(75);
    u2(73);
    u2(1);
    u2(82);
    u2(73);
    u2(1);
    u2(89);
    u2(73);
    u2(1);
    u2(98);
    u2(73);
    u2(1);
    u2(107);
    u2(73);
    u2(1);
    u2(115);
    u2(73);
    u2(1);
    u2(123);
    u2(73);
    u2(1);
    u2(128);
    u2(73);
    u2(1);
    u2(133);

    grunt.file.write(outPath, Buffer.from(bytes));
    grunt.log.ok('Generated ' + outPath);

    outPath = 'classes/modern_test/Java11ConstantDynamicCasts.class';
    bytes = [];

    u4(0xcafebabe);
    u2(0);
    u2(55);
    u2(77);

    cls(2);
    utf8('classes/modern_test/Java11ConstantDynamicCasts');
    cls(4);
    utf8('java/lang/Object');
    utf8('<init>');
    utf8('()V');
    utf8('Code');
    ref(10, 3, 9);
    nameAndType(5, 6);
    utf8('main');
    utf8('([Ljava/lang/String;)V');
    utf8('java/lang/System');
    cls(12);
    utf8('out');
    utf8('Ljava/io/PrintStream;');
    nameAndType(14, 15);
    ref(9, 13, 16);
    utf8('java/io/PrintStream');
    cls(18);
    utf8('println');
    utf8('(I)V');
    nameAndType(20, 21);
    ref(10, 19, 22);
    utf8('BootstrapMethods');
    utf8('java/lang/invoke/ConstantBootstraps');
    cls(25);
    utf8('explicitCast');
    utf8('(Ljava/lang/invoke/MethodHandles$Lookup;Ljava/lang/String;Ljava/lang/Class;Ljava/lang/Object;)Ljava/lang/Object;');
    nameAndType(27, 28);
    ref(10, 26, 29);
    methodHandle(6, 30);
    int32(7);
    utf8('intToLong');
    utf8('J');
    nameAndType(33, 34);
    dynamic(0, 35);
    utf8('(J)V');
    nameAndType(20, 37);
    ref(10, 19, 38);
    int64(0, 258);
    utf8('longToInt');
    utf8('I');
    nameAndType(42, 43);
    dynamic(1, 44);
    float32(65.9);
    utf8('floatToChar');
    utf8('C');
    nameAndType(47, 48);
    dynamic(2, 49);
    utf8('(C)V');
    nameAndType(20, 51);
    ref(10, 19, 52);
    double64(-32766.25);
    utf8('doubleToShort');
    utf8('S');
    nameAndType(56, 57);
    dynamic(3, 58);
    double64(3);
    utf8('doubleToBoolean');
    utf8('Z');
    nameAndType(62, 63);
    dynamic(4, 64);
    utf8('(Z)V');
    nameAndType(20, 66);
    ref(10, 19, 67);
    int32(12);
    utf8('intToDouble');
    utf8('D');
    nameAndType(70, 71);
    dynamic(5, 72);
    utf8('(D)V');
    nameAndType(20, 74);
    ref(10, 19, 75);

    u2(0x0021);
    u2(1);
    u2(3);
    u2(0);
    u2(0);
    u2(2);

    u2(0x0001);
    u2(5);
    u2(6);
    u2(1);
    codeAttr([0x2a, 0xb7, 0x00, 0x08, 0xb1], 1, 1);

    u2(0x0009);
    u2(10);
    u2(11);
    u2(1);
    codeAttr([
      0xb2, 0x00, 0x11,
      0x14, 0x00, 0x24,
      0xb6, 0x00, 0x27,
      0xb2, 0x00, 0x11,
      0x13, 0x00, 0x2d,
      0xb6, 0x00, 0x17,
      0xb2, 0x00, 0x11,
      0x13, 0x00, 0x32,
      0xb6, 0x00, 0x35,
      0xb2, 0x00, 0x11,
      0x13, 0x00, 0x3b,
      0xb6, 0x00, 0x17,
      0xb2, 0x00, 0x11,
      0x13, 0x00, 0x41,
      0xb6, 0x00, 0x44,
      0xb2, 0x00, 0x11,
      0x14, 0x00, 0x49,
      0xb6, 0x00, 0x4c,
      0xb1
    ], 3, 1);

    u2(1);
    u2(24);
    u4(38);
    u2(6);
    u2(31);
    u2(1);
    u2(32);
    u2(31);
    u2(1);
    u2(40);
    u2(31);
    u2(1);
    u2(46);
    u2(31);
    u2(1);
    u2(54);
    u2(31);
    u2(1);
    u2(60);
    u2(31);
    u2(1);
    u2(69);

    grunt.file.write(outPath, Buffer.from(bytes));
    grunt.log.ok('Generated ' + outPath);

    outPath = 'classes/modern_test/Java11ConstantDynamicInvokeInterface.class';
    bytes = [];

    u4(0xcafebabe);
    u2(0);
    u2(55);
    u2(10);

    cls(2);
    utf8('classes/modern_test/Java11ConstantDynamicInvokeInterface');
    cls(4);
    utf8('java/lang/Object');
    utf8('staticTarget');
    utf8('()Ljava/lang/String;');
    utf8('Code');
    utf8('interface-static');
    string(8);

    u2(0x0601);
    u2(1);
    u2(3);
    u2(0);
    u2(0);
    u2(1);

    u2(0x0009);
    u2(5);
    u2(6);
    u2(1);
    codeAttr([0x12, 0x09, 0xb0], 1, 0);

    u2(0);

    grunt.file.write(outPath, Buffer.from(bytes));
    grunt.log.ok('Generated ' + outPath);

    outPath = 'classes/modern_test/Java11ConstantDynamicInvoke.class';
    bytes = [];

    u4(0xcafebabe);
    u2(0);
    u2(55);
    u2(292);

    cls(2);
    utf8('classes/modern_test/Java11ConstantDynamicInvoke');
    cls(4);
    utf8('java/lang/Object');
    utf8('<init>');
    utf8('()V');
    utf8('Code');
    ref(10, 3, 9);
    nameAndType(5, 6);
    utf8('main');
    utf8('([Ljava/lang/String;)V');
    utf8('java/lang/System');
    cls(12);
    utf8('out');
    utf8('Ljava/io/PrintStream;');
    nameAndType(14, 15);
    ref(9, 13, 16);
    utf8('java/io/PrintStream');
    cls(18);
    utf8('println');
    utf8('(Ljava/lang/String;)V');
    nameAndType(20, 21);
    ref(10, 19, 22);
    utf8('BootstrapMethods');
    utf8('java/lang/invoke/ConstantBootstraps');
    cls(25);
    utf8('invoke');
    utf8('(Ljava/lang/invoke/MethodHandles$Lookup;Ljava/lang/String;Ljava/lang/Class;Ljava/lang/invoke/MethodHandle;[Ljava/lang/Object;)Ljava/lang/Object;');
    nameAndType(27, 28);
    ref(10, 26, 29);
    methodHandle(6, 30);
    utf8('target');
    utf8('()Ljava/lang/String;');
    nameAndType(32, 33);
    ref(10, 1, 34);
    methodHandle(6, 35);
    utf8('invokedValue');
    utf8('Ljava/lang/String;');
    nameAndType(37, 38);
    dynamic(0, 39);
    utf8('invoke-target');
    string(41);
    utf8('FIELD_VALUE');
    nameAndType(43, 38);
    ref(9, 1, 44);
    methodHandle(2, 45);
    utf8('fieldValue');
    nameAndType(47, 38);
    dynamic(1, 48);
    utf8('invoke-field');
    string(50);
    utf8('ConstantValue');
    utf8('(I)V');
    nameAndType(20, 53);
    ref(10, 19, 54);
    utf8('add');
    utf8('(I)I');
    nameAndType(56, 57);
    ref(10, 1, 58);
    methodHandle(6, 59);
    int32(37);
    utf8('intValue');
    utf8('I');
    nameAndType(62, 63);
    dynamic(2, 64);
    utf8('java/lang/StringBuilder');
    cls(66);
    utf8('(Ljava/lang/String;)V');
    nameAndType(5, 68);
    ref(10, 67, 69);
    methodHandle(8, 70);
    utf8('builderValue');
    utf8('Ljava/lang/StringBuilder;');
    nameAndType(72, 73);
    dynamic(3, 74);
    utf8('ctor-value');
    string(76);
    utf8('toString');
    nameAndType(78, 33);
    ref(10, 67, 79);
    utf8('java/lang/String');
    cls(81);
    utf8('length');
    utf8('()I');
    nameAndType(83, 84);
    ref(10, 82, 85);
    methodHandle(5, 86);
    utf8('virtualValue');
    nameAndType(88, 63);
    dynamic(4, 89);
    utf8('virtual');
    string(91);
    utf8('INSTANCE_VALUE');
    nameAndType(93, 38);
    ref(9, 1, 94);
    methodHandle(1, 95);
    utf8('receiverValue');
    utf8('Lclasses/modern_test/Java11ConstantDynamicInvoke;');
    nameAndType(97, 98);
    dynamic(5, 99);
    ref(10, 1, 9);
    methodHandle(8, 101);
    utf8('instanceFieldValue');
    nameAndType(103, 38);
    dynamic(6, 104);
    utf8('invoke-instance-field');
    string(106);
    utf8('java/lang/CharSequence');
    cls(108);
    nameAndType(83, 84);
    ref(11, 109, 110);
    methodHandle(9, 111);
    utf8('interfaceValue');
    nameAndType(113, 63);
    dynamic(7, 114);
    utf8('interface');
    string(116);
    utf8('objectValue');
    utf8('Ljava/lang/Object;');
    nameAndType(118, 119);
    dynamic(8, 120);
    utf8('(Ljava/lang/Object;)V');
    nameAndType(20, 122);
    ref(10, 19, 123);
    utf8('objectFieldValue');
    nameAndType(125, 119);
    dynamic(9, 126);
    utf8('objectInstanceFieldValue');
    nameAndType(128, 119);
    dynamic(10, 129);
    utf8('objectBuilderValue');
    nameAndType(131, 119);
    dynamic(11, 132);
    utf8('java/lang/Integer');
    cls(134);
    utf8('boxedIntValue');
    utf8('Ljava/lang/Integer;');
    nameAndType(136, 137);
    dynamic(12, 138);
    utf8('objectIntValue');
    nameAndType(140, 119);
    dynamic(13, 141);
    utf8('INT_FIELD_VALUE');
    nameAndType(143, 63);
    ref(9, 1, 144);
    methodHandle(2, 145);
    utf8('boxedIntFieldValue');
    nameAndType(147, 137);
    dynamic(14, 148);
    utf8('objectIntFieldValue');
    nameAndType(150, 119);
    dynamic(15, 151);
    utf8('INSTANCE_INT_VALUE');
    nameAndType(153, 63);
    ref(9, 1, 154);
    methodHandle(1, 155);
    utf8('boxedInstanceIntFieldValue');
    nameAndType(157, 137);
    dynamic(16, 158);
    utf8('objectInstanceIntFieldValue');
    nameAndType(160, 119);
    dynamic(17, 161);
    utf8('boxedArg');
    utf8('(Ljava/lang/Integer;)I');
    nameAndType(163, 164);
    ref(10, 1, 165);
    methodHandle(6, 166);
    utf8('boxedArgValue');
    nameAndType(168, 63);
    dynamic(18, 169);
    nameAndType(62, 84);
    ref(10, 135, 171);
    utf8('unboxedArg');
    nameAndType(173, 57);
    ref(10, 1, 174);
    methodHandle(6, 175);
    utf8('unboxedArgValue');
    nameAndType(177, 63);
    dynamic(19, 178);
    utf8('longWidenedArg');
    utf8('(J)J');
    nameAndType(180, 181);
    ref(10, 1, 182);
    methodHandle(6, 183);
    utf8('longWidenedArgValue');
    utf8('J');
    nameAndType(185, 186);
    dynamic(20, 187);
    utf8('(J)V');
    nameAndType(20, 189);
    ref(10, 19, 190);
    utf8('SETTER_FIELD');
    nameAndType(192, 38);
    ref(9, 1, 193);
    methodHandle(4, 194);
    utf8('setStaticResult');
    nameAndType(196, 119);
    dynamic(21, 197);
    utf8('setStaticValue');
    string(199);
    methodHandle(2, 194);
    utf8('setStaticFieldValue');
    nameAndType(202, 38);
    dynamic(22, 203);
    methodHandle(3, 95);
    utf8('setInstanceResult');
    nameAndType(206, 119);
    dynamic(23, 207);
    utf8('setInstanceValue');
    string(209);
    utf8('setInstanceFieldValue');
    nameAndType(211, 38);
    dynamic(24, 212);
    utf8('varargsCount');
    utf8('(Ljava/lang/String;[Ljava/lang/String;)I');
    nameAndType(214, 215);
    ref(10, 1, 216);
    methodHandle(6, 217);
    utf8('varargsValue');
    nameAndType(219, 63);
    dynamic(25, 220);
    utf8('varargs-prefix');
    string(222);
    utf8('varargs-one');
    string(224);
    utf8('varargs-two');
    string(226);
    utf8('longReturnWidenedValue');
    nameAndType(228, 186);
    dynamic(26, 229);
    utf8('longFieldReturnWidenedValue');
    nameAndType(231, 186);
    dynamic(27, 232);
    utf8('voidTarget');
    nameAndType(234, 6);
    ref(10, 1, 235);
    methodHandle(6, 236);
    utf8('voidResult');
    nameAndType(238, 119);
    dynamic(28, 239);
    utf8('specialTarget');
    nameAndType(241, 33);
    ref(10, 1, 242);
    methodHandle(7, 243);
    utf8('specialValue');
    nameAndType(245, 38);
    dynamic(29, 246);
    utf8('special-invoke');
    string(248);
    utf8('longConstantWidenedArgValue');
    nameAndType(250, 186);
    dynamic(30, 251);
    utf8('longVarargsFirst');
    utf8('(Ljava/lang/String;[J)J');
    nameAndType(253, 254);
    ref(10, 1, 255);
    methodHandle(6, 256);
    utf8('longVarargsWidenedValue');
    nameAndType(258, 186);
    dynamic(31, 259);
    utf8('classes/modern_test/Java11ConstantDynamicInvokeInterface');
    cls(261);
    utf8('staticInterfaceValue');
    nameAndType(263, 38);
    utf8('staticTarget');
    nameAndType(265, 33);
    ref(11, 262, 266);
    methodHandle(6, 267);
    dynamic(32, 264);
    utf8('DOUBLE_SETTER_FIELD');
    utf8('D');
    nameAndType(270, 271);
    ref(9, 1, 272);
    methodHandle(4, 273);
    methodHandle(2, 273);
    utf8('setDoubleResult');
    nameAndType(276, 119);
    dynamic(33, 277);
    utf8('doubleFieldValue');
    nameAndType(279, 271);
    dynamic(34, 280);
    utf8('(D)V');
    nameAndType(20, 282);
    ref(10, 19, 283);
    int64(0, 37);
    utf8('boxedDoubleFieldValue');
    nameAndType(287, 119);
    dynamic(34, 288);
    double64(0.5);

    u2(0x0021);
    u2(1);
    u2(3);
    u2(0);
    u2(6);

    u2(0x0019);
    u2(43);
    u2(38);
    u2(1);
    u2(52);
    u4(2);
    u2(51);

    u2(0x0001);
    u2(93);
    u2(38);
    u2(0);

    u2(0x0019);
    u2(143);
    u2(63);
    u2(1);
    u2(52);
    u4(2);
    u2(61);

    u2(0x0001);
    u2(153);
    u2(63);
    u2(0);

    u2(0x0009);
    u2(192);
    u2(38);
    u2(0);

    u2(0x0009);
    u2(270);
    u2(271);
    u2(0);

    u2(11);

    u2(0x0001);
    u2(5);
    u2(6);
    u2(1);
    codeAttr([
      0x2a,
      0xb7, 0x00, 0x08,
      0x2a,
      0x13, 0x00, 0x6b,
      0xb5, 0x00, 0x5f,
      0x2a,
      0x10, 0x25,
      0xb5, 0x00, 0x9b,
      0xb1
    ], 2, 1);

    u2(0x0009);
    u2(10);
    u2(11);
    u2(1);
    codeAttr([
      0xb2, 0x00, 0x11,
      0x13, 0x00, 0x28,
      0xb6, 0x00, 0x17,
      0xb2, 0x00, 0x11,
      0x13, 0x00, 0x31,
      0xb6, 0x00, 0x17,
      0xb2, 0x00, 0x11,
      0x13, 0x00, 0x41,
      0xb6, 0x00, 0x37,
      0xb2, 0x00, 0x11,
      0x13, 0x00, 0x4b,
      0xb6, 0x00, 0x50,
      0xb6, 0x00, 0x17,
      0xb2, 0x00, 0x11,
      0x13, 0x00, 0x5a,
      0xb6, 0x00, 0x37,
      0xb2, 0x00, 0x11,
      0x13, 0x00, 0x69,
      0xb6, 0x00, 0x17,
      0xb2, 0x00, 0x11,
      0x13, 0x00, 0x73,
      0xb6, 0x00, 0x37,
      0xb2, 0x00, 0x11,
      0x13, 0x00, 0x79,
      0xb6, 0x00, 0x7c,
      0xb2, 0x00, 0x11,
      0x13, 0x00, 0x7f,
      0xb6, 0x00, 0x7c,
      0xb2, 0x00, 0x11,
      0x13, 0x00, 0x82,
      0xb6, 0x00, 0x7c,
      0xb2, 0x00, 0x11,
      0x13, 0x00, 0x85,
      0xb6, 0x00, 0x7c,
      0xb2, 0x00, 0x11,
      0x13, 0x00, 0x8b,
      0xb6, 0x00, 0x7c,
      0xb2, 0x00, 0x11,
      0x13, 0x00, 0x8e,
      0xb6, 0x00, 0x7c,
      0xb2, 0x00, 0x11,
      0x13, 0x00, 0x95,
      0xb6, 0x00, 0x7c,
      0xb2, 0x00, 0x11,
      0x13, 0x00, 0x98,
      0xb6, 0x00, 0x7c,
      0xb2, 0x00, 0x11,
      0x13, 0x00, 0x9f,
      0xb6, 0x00, 0x7c,
      0xb2, 0x00, 0x11,
      0x13, 0x00, 0xa2,
      0xb6, 0x00, 0x7c,
      0xb2, 0x00, 0x11,
      0x13, 0x00, 0xaa,
      0xb6, 0x00, 0x37,
      0xb2, 0x00, 0x11,
      0x13, 0x00, 0xb3,
      0xb6, 0x00, 0x37,
      0xb2, 0x00, 0x11,
      0x14, 0x00, 0xbc,
      0xb6, 0x00, 0xbf,
      0xb2, 0x00, 0x11,
      0x13, 0x00, 0xc6,
      0xb6, 0x00, 0x7c,
      0xb2, 0x00, 0x11,
      0x13, 0x00, 0xcc,
      0xb6, 0x00, 0x17,
      0xb2, 0x00, 0x11,
      0x13, 0x00, 0xd0,
      0xb6, 0x00, 0x7c,
      0xb2, 0x00, 0x11,
      0x13, 0x00, 0xd5,
      0xb6, 0x00, 0x17,
      0xb2, 0x00, 0x11,
      0x13, 0x00, 0xdd,
      0xb6, 0x00, 0x37,
      0xb2, 0x00, 0x11,
      0x14, 0x00, 0xe6,
      0xb6, 0x00, 0xbf,
      0xb2, 0x00, 0x11,
      0x14, 0x00, 0xe9,
      0xb6, 0x00, 0xbf,
      0xb2, 0x00, 0x11,
      0x13, 0x00, 0xf0,
      0xb6, 0x00, 0x7c,
      0xb2, 0x00, 0x11,
      0x13, 0x00, 0xf7,
      0xb6, 0x00, 0x17,
      0xb2, 0x00, 0x11,
      0x14, 0x00, 0xfc,
      0xb6, 0x00, 0xbf,
      0xb2, 0x00, 0x11,
      0x14, 0x01, 0x04,
      0xb6, 0x00, 0xbf,
      0xb2, 0x00, 0x11,
      0x13, 0x01, 0x0d,
      0xb6, 0x00, 0x17,
      0xb2, 0x00, 0x11,
      0x13, 0x01, 0x16,
      0xb6, 0x00, 0x7c,
      0xb2, 0x00, 0x11,
      0x14, 0x01, 0x19,
      0xb6, 0x01, 0x1c,
      0xb2, 0x00, 0x11,
      0x13, 0x01, 0x21,
      0xb6, 0x00, 0x7c,
      0xb2, 0x00, 0x11,
      0x14, 0x01, 0x19,
      0x14, 0x01, 0x22,
      0x63,
      0xb6, 0x01, 0x1c,
      0xb1
    ], 5, 1);

    u2(0x0009);
    u2(32);
    u2(33);
    u2(1);
    codeAttr([0x12, 0x2a, 0xb0], 1, 0);

    u2(0x0009);
    u2(56);
    u2(57);
    u2(1);
    codeAttr([0x1a, 0x08, 0x60, 0xac], 2, 1);

    u2(0x0009);
    u2(163);
    u2(164);
    u2(1);
    codeAttr([0x2a, 0xb6, 0x00, 0xac, 0xac], 1, 1);

    u2(0x0009);
    u2(173);
    u2(57);
    u2(1);
    codeAttr([0x1a, 0xac], 1, 1);

    u2(0x0009);
    u2(180);
    u2(181);
    u2(1);
    codeAttr([0x1e, 0xad], 2, 2);

    u2(0x0089);
    u2(214);
    u2(215);
    u2(1);
    codeAttr([0x2b, 0xbe, 0xac], 1, 2);

    u2(0x0089);
    u2(253);
    u2(254);
    u2(1);
    codeAttr([0x2b, 0x03, 0x2f, 0xad], 2, 2);

    u2(0x0009);
    u2(234);
    u2(6);
    u2(1);
    codeAttr([0xb1], 0, 0);

    u2(0x0002);
    u2(241);
    u2(33);
    u2(1);
    codeAttr([0x12, 0xf9, 0xb0], 1, 1);

    u2(1);
    u2(24);
    u4(266);
    u2(35);
    u2(31);
    u2(1);
    u2(36);
    u2(31);
    u2(1);
    u2(46);
    u2(31);
    u2(2);
    u2(60);
    u2(61);
    u2(31);
    u2(2);
    u2(71);
    u2(77);
    u2(31);
    u2(2);
    u2(87);
    u2(92);
    u2(31);
    u2(1);
    u2(102);
    u2(31);
    u2(2);
    u2(96);
    u2(100);
    u2(31);
    u2(2);
    u2(112);
    u2(117);
    u2(31);
    u2(1);
    u2(36);
    u2(31);
    u2(1);
    u2(46);
    u2(31);
    u2(2);
    u2(96);
    u2(100);
    u2(31);
    u2(2);
    u2(71);
    u2(77);
    u2(31);
    u2(2);
    u2(60);
    u2(61);
    u2(31);
    u2(2);
    u2(60);
    u2(61);
    u2(31);
    u2(1);
    u2(146);
    u2(31);
    u2(1);
    u2(146);
    u2(31);
    u2(2);
    u2(156);
    u2(100);
    u2(31);
    u2(2);
    u2(167);
    u2(61);
    u2(31);
    u2(2);
    u2(156);
    u2(100);
    u2(31);
    u2(2);
    u2(176);
    u2(139);
    u2(31);
    u2(2);
    u2(184);
    u2(139);
    u2(31);
    u2(2);
    u2(195);
    u2(200);
    u2(31);
    u2(1);
    u2(201);
    u2(31);
    u2(3);
    u2(205);
    u2(100);
    u2(210);
    u2(31);
    u2(2);
    u2(96);
    u2(100);
    u2(31);
    u2(4);
    u2(218);
    u2(223);
    u2(225);
    u2(227);
    u2(31);
    u2(2);
    u2(60);
    u2(61);
    u2(31);
    u2(1);
    u2(146);
    u2(31);
    u2(1);
    u2(237);
    u2(31);
    u2(2);
    u2(244);
    u2(100);
    u2(31);
    u2(2);
    u2(184);
    u2(61);
    u2(31);
    u2(3);
    u2(257);
    u2(223);
    u2(61);
    u2(31);
    u2(1);
    u2(268);
    u2(31);
    u2(2);
    u2(274);
    u2(285);
    u2(31);
    u2(1);
    u2(275);

    grunt.file.write(outPath, Buffer.from(bytes));
    grunt.log.ok('Generated ' + outPath);
  });

  grunt.registerTask('javac_modern_classlib', 'Compile Java 9+ bootstrap class-library shims.', function() {
    var done: (status?: boolean) => void = this.async(),
      srcDir = 'classes/modern_classlib',
      outDir = 'classes/modern_classlib/out',
      marker = outDir + '/.timestamp',
      inputFiles = grunt.file.expand([srcDir + '/**/*.java']),
      specialInputFiles = inputFiles.filter(function(src: string): boolean {
        return src === srcDir + '/java/lang/System$Logger.java' ||
          src === srcDir + '/java/lang/System$DoppioLogger.java';
      }),
      normalInputFiles = inputFiles.filter(function(src: string): boolean {
        return specialInputFiles.indexOf(src) === -1;
      }),
      newestSource = inputFiles.reduce(function(newest: Date, src: string): Date {
        var mtime = fs.statSync(src).mtime;
        return mtime > newest ? mtime : newest;
      }, new Date(0));
    grunt.config.requires('build.javac');
    if (inputFiles.length === 0) {
      return done();
    }
    if (fs.existsSync(marker) && fs.statSync(marker).mtime > newestSource) {
      return done();
    }
    grunt.file.mkdir(outDir);
    function compileSpecialFiles(): void {
      if (specialInputFiles.length === 0) {
        fs.writeFileSync(marker, '');
        done();
        return;
      }
      child_process.exec(shellEscape(grunt.config('build.javac')) + ' -J-Dfile.encoding=UTF8 -source 9 -target 9 -implicit:none --patch-module java.base=' + shellEscape(srcDir) + ' -d ' + shellEscape(outDir) + ' ' + specialInputFiles.map(shellEscape).join(' '),
        function(err?: any, stdout?: Buffer, stderr?: Buffer) {
          if (err) {
            grunt.fail.fatal('Error compiling special modern classlib sources: ' + err + '\n' + stdout.toString() + stderr.toString());
          }
          fs.writeFileSync(marker, '');
          done();
        });
    }
    if (normalInputFiles.length === 0) {
      compileSpecialFiles();
      return;
    }
    child_process.exec(shellEscape(grunt.config('build.javac')) + ' -J-Dfile.encoding=UTF8 --release 9 --patch-module java.base=' + shellEscape(srcDir) + ' -d ' + shellEscape(outDir) + ' ' + normalInputFiles.map(shellEscape).join(' '),
      function(err?: any, stdout?: Buffer, stderr?: Buffer) {
        if (err) {
          grunt.fail.fatal('Error compiling modern classlib: ' + err + '\n' + stdout.toString() + stderr.toString());
        }
        compileSpecialFiles();
      });
  });

  grunt.registerTask('javac_modern_multirelease_jar', 'Compile a Java 9 multi-release JAR fixture.', function() {
    var done: (status?: boolean) => void = this.async(),
      srcDir = 'classes/modern_multirelease',
      outRoot = srcDir + '/out',
      outBase = outRoot + '/base',
      out9 = outRoot + '/9',
      manifestPath = outRoot + '/MANIFEST.MF',
      jarPath = srcDir + '/java9-mr.jar',
      baseSources = grunt.file.expand([srcDir + '/base/**/*.java']),
      version9Sources = grunt.file.expand([srcDir + '/version9/**/*.java']),
      javac = shellEscape(grunt.config('build.javac')),
      jarTool = path.join(path.dirname(grunt.config('build.javac')), os.platform() === 'win32' ? 'jar.exe' : 'jar');
    grunt.config.requires('build.javac');
    if (!fs.existsSync(jarTool)) {
      jarTool = 'jar';
    }
    grunt.file.delete(outRoot);
    grunt.file.mkdir(outBase);
    grunt.file.mkdir(out9);
    fs.writeFileSync(manifestPath, 'Manifest-Version: 1.0\nMulti-Release: true\n\n');
    async.series([
      function(next: (err?: any) => void): void {
        child_process.exec(javac + ' -J-Dfile.encoding=UTF8 --release 8 -d ' + shellEscape(outBase) + ' ' + baseSources.map(shellEscape).join(' '),
          function(err?: any, stdout?: Buffer, stderr?: Buffer) {
            next(err ? 'Error compiling multi-release base classes: ' + err + '\n' + stdout.toString() + stderr.toString() : undefined);
          });
      },
      function(next: (err?: any) => void): void {
        child_process.exec(javac + ' -J-Dfile.encoding=UTF8 --release 9 -d ' + shellEscape(out9) + ' ' + version9Sources.map(shellEscape).join(' '),
          function(err?: any, stdout?: Buffer, stderr?: Buffer) {
            next(err ? 'Error compiling multi-release Java 9 classes: ' + err + '\n' + stdout.toString() + stderr.toString() : undefined);
          });
      },
      function(next: (err?: any) => void): void {
        child_process.exec(shellEscape(jarTool) + ' --create --file ' + shellEscape(jarPath) + ' --manifest ' + shellEscape(manifestPath) + ' -C ' + shellEscape(outBase) + ' . --release 9 -C ' + shellEscape(out9) + ' .',
          function(err?: any, stdout?: Buffer, stderr?: Buffer) {
            next(err ? 'Error creating multi-release JAR: ' + err + '\n' + stdout.toString() + stderr.toString() : undefined);
          });
      }
    ], function(err?: any): void {
      if (err) {
        grunt.fail.fatal(err);
      }
      grunt.log.ok('Generated ' + jarPath);
      done();
    });
  });

  grunt.registerMultiTask('javac_modern', 'Run javac for modern Java compatibility fixtures.', function() {
    var files: {src: string[]; dest: string}[] = <any> this.files,
      inputFiles: string[] = [],
      done: (status?: boolean) => void = this.async(),
      options: { release: number; destDir?: string; extraArgs?: string[] } = this.options({ release: 17 }),
      releaseVersion = options.release,
      destDir = options.destDir,
      extraArgs = options.extraArgs || [],
      outputOption = '';
    grunt.config.requires('build.javac');
    files.forEach(function(e: { src: string[]; dest: string }) {
      var dest = e.src[0].slice(0, -4) + 'class';
      if (!destDir && fs.existsSync(dest) && fs.statSync(dest).mtime > fs.statSync(e.src[0]).mtime) {
        return;
      }
      inputFiles = inputFiles.concat(e.src);
    });
    if (inputFiles.length === 0) {
      return done();
    }
    if (destDir) {
      grunt.file.mkdir(destDir);
      outputOption = ' -d ' + shellEscape(destDir);
    }
    child_process.exec(shellEscape(grunt.config('build.javac')) + ' -J-Dfile.encoding=UTF8 --release ' + releaseVersion + ' ' + extraArgs.join(' ') + outputOption + ' ' + inputFiles.join(' '),
      function(err?: any, stdout?: Buffer, stderr?: Buffer) {
        if (err) {
          grunt.fail.fatal('Error running modern javac: ' + err + '\n' + stdout.toString() + stderr.toString());
        }
        done();
      });
  });

  grunt.registerMultiTask('run_java_modern', 'Run modern Java fixtures on the native JVM.', function() {
    var files: {src: string[]; dest: string}[] = <any> this.files,
      done: (status?: boolean) => void = this.async(),
      tasks: Array<AsyncFunction<void>> = [];
    grunt.config.requires('build.java');
    files.forEach(function(file: {src: string[]; dest: string}) {
      var classFile = file.src[0].slice(0, -4) + 'class',
        sourceMtime = fs.statSync(file.src[0]).mtime,
        classMtime = fs.existsSync(classFile) ? fs.statSync(classFile).mtime : sourceMtime;
      if (fs.existsSync(file.dest) && fs.statSync(file.dest).mtime > sourceMtime && fs.statSync(file.dest).mtime > classMtime) {
        return;
      }
      tasks.push(function(cb: (err?: any) => void) {
        var className = file.src[0].slice(0, -5).replace(/[\\\/]/g, '.');
        child_process.exec(shellEscape(grunt.config('build.java')) + ' -Dfile.encoding=UTF8 -ea -cp . ' + className,
          function(err?: any, stdout?: Buffer, stderr?: Buffer) {
            fs.writeFileSync(file.dest, stdout.toString() + stderr.toString());
            cb(err);
          });
      });
    });

    async.parallelLimit(tasks, os.cpus().length, function(err?: any) {
      if (err) {
        grunt.fail.fatal('modern java failed: ' + err);
      }
      done();
    });
  });

  grunt.registerTask('run_java_modern_multirelease', 'Run the multi-release JAR fixture on the native JVM.', function() {
    var done: (status?: boolean) => void = this.async(),
      jarPath = 'classes/modern_multirelease/java9-mr.jar',
      mainClass = 'classes.modern_mr.Java9MultiReleaseJar',
      outPath = 'classes/modern_multirelease/Java9MultiReleaseJar.runout';
    grunt.config.requires('build.java');
    child_process.exec(shellEscape(grunt.config('build.java')) + ' -Dfile.encoding=UTF8 -ea -cp ' + shellEscape(jarPath) + ' ' + mainClass,
      function(err?: any, stdout?: Buffer, stderr?: Buffer) {
        fs.writeFileSync(outPath, stdout.toString() + stderr.toString());
        if (err) {
          grunt.fail.fatal('multi-release native java failed: ' + err);
        }
        done();
      });
  });

  grunt.registerTask('unit_test_modern_multirelease', 'Run the multi-release JAR fixture on Doppio.', function() {
    var done: (status?: boolean) => void = this.async(),
      jarPath = 'classes/modern_multirelease/java9-mr.jar',
      mainClass = 'classes.modern_mr.Java9MultiReleaseJar',
      outPath = 'classes/modern_multirelease/Java9MultiReleaseJar.runout';
    child_process.exec('node --no-deprecation build/release-cli/console/runner.js -classpath ' + shellEscape(jarPath) + ' ' + mainClass,
      function(err?: any, stdout?: Buffer, stderr?: Buffer) {
        var actual = stdout.toString() + stderr.toString(),
          expected = fs.readFileSync(outPath, 'utf8');
        if (err || actual !== expected) {
          grunt.fail.fatal('multi-release Doppio output does not match native JVM.\nDoppio:\n' + actual + '\nJava:\n' + expected);
        }
        grunt.log.ok('multi-release JAR output matched native JVM.');
        done();
      });
  });

  grunt.registerTask('unit_test_java18_unsigned_multiply_high', 'Run the Java 18 unsigned multiply-high fixture on Doppio.', function() {
    var done: (status?: boolean) => void = this.async(),
      mainClass = 'classes.modern_test.Java18UnsignedMultiplyHigh',
      outPath = 'classes/modern_test/Java18UnsignedMultiplyHigh.runout';
    child_process.exec('node --no-deprecation build/release-cli/console/runner.js -classpath . ' + mainClass,
      function(err?: any, stdout?: Buffer, stderr?: Buffer) {
        var actual = stdout.toString() + stderr.toString(),
          expected = fs.readFileSync(outPath, 'utf8');
        if (err || actual !== expected) {
          grunt.fail.fatal('Java 18 unsignedMultiplyHigh Doppio output does not match expected output.\nDoppio:\n' + actual + '\nExpected:\n' + expected);
        }
        grunt.log.ok('Java 18 unsignedMultiplyHigh output matched expected output.');
        done();
      });
  });

  grunt.registerTask('unit_test_java18_default_charset', 'Run the Java 18 default charset fixture on Doppio.', function() {
    var done: (status?: boolean) => void = this.async(),
      mainClass = 'classes.modern_test.Java18DefaultCharset',
      outPath = 'classes/modern_test/Java18DefaultCharset.runout';
    child_process.exec('node --no-deprecation build/release-cli/console/runner.js -classpath . ' + mainClass,
      function(err?: any, stdout?: Buffer, stderr?: Buffer) {
        var actual = stdout.toString() + stderr.toString(),
          expected = fs.readFileSync(outPath, 'utf8');
        if (err || actual !== expected) {
          grunt.fail.fatal('Java 18 default charset Doppio output does not match expected output.\nDoppio:\n' + actual + '\nExpected:\n' + expected);
        }
        grunt.log.ok('Java 18 default charset output matched expected output.');
        done();
      });
  });

  grunt.registerMultiTask('parse_classfile_modern', 'Parse modern class-file fixtures with Doppio.', function() {
    var ReferenceClassData = require('../build/release-cli/src/ClassData').ReferenceClassData,
      options: {
        nestHost?: string;
        nestMembers?: string[];
        permittedSubclasses?: string[];
        recordComponents?: string[];
      } = this.options({});
    this.files.forEach(function(file: {src: string[]; dest: string}) {
      file.src.forEach(function(src: string) {
        var classData = new ReferenceClassData(fs.readFileSync(src));
        if (options.nestHost && classData.getNestHostName() !== options.nestHost) {
          grunt.fail.fatal(src + ' nest host mismatch: expected ' + options.nestHost + ', got ' + classData.getNestHostName());
        }
        if (options.nestMembers) {
          var members = classData.getNestMemberNames();
          options.nestMembers.forEach(function(expectedMember: string) {
            if (members.indexOf(expectedMember) === -1) {
              grunt.fail.fatal(src + ' missing nest member ' + expectedMember + '. Members: ' + members.join(', '));
            }
          });
        }
        if (options.permittedSubclasses) {
          var subclasses = classData.getPermittedSubclassNames();
          options.permittedSubclasses.forEach(function(expectedSubclass: string) {
            if (subclasses.indexOf(expectedSubclass) === -1) {
              grunt.fail.fatal(src + ' missing permitted subclass ' + expectedSubclass + '. Subclasses: ' + subclasses.join(', '));
            }
          });
        }
        if (options.recordComponents) {
          var components = classData.getRecordComponentNames();
          options.recordComponents.forEach(function(expectedComponent: string) {
            if (components.indexOf(expectedComponent) === -1) {
              grunt.fail.fatal(src + ' missing record component ' + expectedComponent + '. Components: ' + components.join(', '));
            }
          });
        }
        grunt.log.ok('Parsed ' + src);
      });
    });
  });
}

export = modernJava;
