const freeze=value=>{if(value&&typeof value==='object'&&!Object.isFrozen(value)){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};

export const verifierPhaseScope='LIB-007 C7e1 public Java 25 structural/parser and bytecode verifier phase profile';

// Independent final stock25 source/helper and raw packet contracts. No runtime oracle files.
export const verifierInputContract=freeze({
  "source": "ci/ClassFileVerifierPhaseRegression.java",
  "additionalSources": [
    "classes/modern_fixture/classfile/ClassFileSupport.java"
  ],
  "mainClass": "classes.modern_test.ClassFileVerifierPhaseRegression",
  "driverClassNames": [
    "classes.modern_test.ClassFileSupport",
    "classes.modern_test.ClassFileVerifierPhaseRegression",
    "classes.modern_test.ClassFileVerifierPhaseRegression$NamedParserAttribute",
    "classes.modern_test.ClassFileVerifierPhaseRegression$NamedParserMapper",
    "classes.modern_test.ClassFileVerifierPhaseRegression$ParserAttribute",
    "classes.modern_test.ClassFileVerifierPhaseRegression$ParserMapper"
  ],
  "javacFlags": [
    "-g",
    "-parameters"
  ],
  "sourceDigests": [
    {
      "path": "ci/ClassFileVerifierPhaseRegression.java",
      "sha256": "7ac5164690959577620303dc4c715d118843337741da2c4d5d0d73cd45088425"
    },
    {
      "path": "classes/modern_fixture/classfile/ClassFileSupport.java",
      "sha256": "ea7ac3dd4df7fe40d882ce56c883002817ab0de371d2ceedd611f61321c6fdf2"
    }
  ],
  "originalContracts": [
    {
      "className": "classes.modern_test.ClassFileSupport",
      "flags": 49,
      "superclass": "java.lang.Object",
      "interfaces": [],
      "fields": [],
      "attributeDigest": "5c19ec0782cc62232d40e437ee9e43aa1362aba96c3e0230d8cb7565d64d1477",
      "bootstrapDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
      "methods": [
        {
          "name": "<init>",
          "descriptor": "()V",
          "flags": 2,
          "instructionDigest": "61277a5e357118f28df66077d7f68f413c30d94863855ece70b09fb1fb01faf7"
        },
        {
          "name": "check",
          "descriptor": "(Z)V",
          "flags": 9,
          "instructionDigest": "29e7c132269d6d9f503bd8109819252b0d42fd0bc1f80a766943179f6f6de895"
        },
        {
          "name": "emit",
          "descriptor": "(Ljava/lang/String;Ljava/lang/String;)V",
          "flags": 9,
          "instructionDigest": "5bc59490631828810b32f4189be812bdce2df055151126f7300497ad124e137b"
        },
        {
          "name": "bytes",
          "descriptor": "(Ljava/lang/Class;Ljava/lang/String;)[B",
          "flags": 9,
          "instructionDigest": "2bafd6f5fc2d6415013eecbc2a459bf219fd2b0b15810ebf512034d99cbadf5c"
        },
        {
          "name": "artifact",
          "descriptor": "(Ljava/lang/String;Ljava/lang/String;[B)V",
          "flags": 9,
          "instructionDigest": "c47e358d20928869181cd4c56bd24e2fb8b21b29f56323d3f9ae68a3a214fc56"
        }
      ]
    },
    {
      "className": "classes.modern_test.ClassFileVerifierPhaseRegression$NamedParserAttribute",
      "flags": 48,
      "superclass": "java.lang.classfile.CustomAttribute",
      "interfaces": [],
      "fields": [
        {
          "name": "mapper",
          "descriptor": "Lclasses/modern_test/ClassFileVerifierPhaseRegression$NamedParserMapper;",
          "flags": 18
        },
        {
          "name": "boundName",
          "descriptor": "Ljava/lang/classfile/constantpool/Utf8Entry;",
          "flags": 18
        }
      ],
      "attributeDigest": "2dace470c893f5a9162a4b4ea0fe7934e14dace43bfd84052f54ff1f9aeec086",
      "bootstrapDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
      "methods": [
        {
          "name": "<init>",
          "descriptor": "(Lclasses/modern_test/ClassFileVerifierPhaseRegression$NamedParserMapper;Ljava/lang/classfile/constantpool/Utf8Entry;)V",
          "flags": 0,
          "instructionDigest": "cb55a39e225bad1b55e5bca1ab933673e1957f015fec694bac1953d40f534239"
        },
        {
          "name": "attributeName",
          "descriptor": "()Ljava/lang/classfile/constantpool/Utf8Entry;",
          "flags": 1,
          "instructionDigest": "982df4a7b04e1ed822abaa7b904aa43c3950ab277a5bf1a9e9899413a9953281"
        }
      ]
    },
    {
      "className": "classes.modern_test.ClassFileVerifierPhaseRegression$NamedParserMapper",
      "flags": 48,
      "superclass": "java.lang.Object",
      "interfaces": [
        "java.lang.classfile.AttributeMapper"
      ],
      "fields": [
        {
          "name": "multiple",
          "descriptor": "Z",
          "flags": 18
        },
        {
          "name": "heldVerify",
          "descriptor": "Ljava/lang/VerifyError;",
          "flags": 16
        },
        {
          "name": "heldName",
          "descriptor": "Ljava/lang/IllegalArgumentException;",
          "flags": 16
        },
        {
          "name": "armed",
          "descriptor": "I",
          "flags": 0
        },
        {
          "name": "calls",
          "descriptor": "I",
          "flags": 0
        },
        {
          "name": "nameCalls",
          "descriptor": "I",
          "flags": 0
        }
      ],
      "attributeDigest": "33fc60d24c00214def512f412dfb32e3e74e528332886fed8218dce9d22a5d45",
      "bootstrapDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
      "methods": [
        {
          "name": "<init>",
          "descriptor": "(Z)V",
          "flags": 0,
          "instructionDigest": "38ec640f710b9a1b37df5ff4e362a63a8f9c9a67156ce6f77c96b007c3fdc9be"
        },
        {
          "name": "name",
          "descriptor": "()Ljava/lang/String;",
          "flags": 1,
          "instructionDigest": "977c6591f0c575687466d3ebac93b1f4afde73d097d2b3f42def39064e6f34d5"
        },
        {
          "name": "stability",
          "descriptor": "()Ljava/lang/classfile/AttributeMapper$AttributeStability;",
          "flags": 1,
          "instructionDigest": "b49f62ce8156197e38a15edffe1c7e7da29942439eea507abfea9bf1b43b6905"
        },
        {
          "name": "allowMultiple",
          "descriptor": "()Z",
          "flags": 1,
          "instructionDigest": "fef4d0af2a5b3b4149caf6aae29f59e4c61737725bfa32183121141f28716e01"
        },
        {
          "name": "readAttribute",
          "descriptor": "(Ljava/lang/classfile/AttributedElement;Ljava/lang/classfile/ClassReader;I)Lclasses/modern_test/ClassFileVerifierPhaseRegression$NamedParserAttribute;",
          "flags": 1,
          "instructionDigest": "31c9a07d2b7df76ac54a15bff85647f18eaae57042a80a9a98ebf984a0ad8341"
        },
        {
          "name": "writeAttribute",
          "descriptor": "(Ljava/lang/classfile/BufWriter;Lclasses/modern_test/ClassFileVerifierPhaseRegression$NamedParserAttribute;)V",
          "flags": 1,
          "instructionDigest": "ec717c097595d92c7ed5ed0a5d8ad0ca221d7a4ceb07e732a386b90c34ecf649"
        },
        {
          "name": "writeAttribute",
          "descriptor": "(Ljava/lang/classfile/BufWriter;Ljava/lang/classfile/Attribute;)V",
          "flags": 4161,
          "instructionDigest": "94b67b18f9c5ba4da8afd560f5e603dc250596f623217b20858f596a7db99312"
        },
        {
          "name": "readAttribute",
          "descriptor": "(Ljava/lang/classfile/AttributedElement;Ljava/lang/classfile/ClassReader;I)Ljava/lang/classfile/Attribute;",
          "flags": 4161,
          "instructionDigest": "a019e93a38c5a449be5bfa6820fba4a8d5f61bd1e91ffd9823ce62523120a685"
        }
      ]
    },
    {
      "className": "classes.modern_test.ClassFileVerifierPhaseRegression$ParserAttribute",
      "flags": 48,
      "superclass": "java.lang.classfile.CustomAttribute",
      "interfaces": [],
      "fields": [],
      "attributeDigest": "ea38a0c8db2fca6f418c3d1f3dc18faa52f2c4ba37da23df4d7799afa6109ba4",
      "bootstrapDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
      "methods": [
        {
          "name": "<init>",
          "descriptor": "(Lclasses/modern_test/ClassFileVerifierPhaseRegression$ParserMapper;)V",
          "flags": 0,
          "instructionDigest": "d4f70cc177cf5f8629a1a8d6fb5a782677a266c16736340a23e9349a07445d7d"
        }
      ]
    },
    {
      "className": "classes.modern_test.ClassFileVerifierPhaseRegression$ParserMapper",
      "flags": 48,
      "superclass": "java.lang.Object",
      "interfaces": [
        "java.lang.classfile.AttributeMapper"
      ],
      "fields": [
        {
          "name": "heldVerify",
          "descriptor": "Ljava/lang/VerifyError;",
          "flags": 16
        },
        {
          "name": "heldArgument",
          "descriptor": "Ljava/lang/IllegalArgumentException;",
          "flags": 16
        },
        {
          "name": "armed",
          "descriptor": "I",
          "flags": 0
        },
        {
          "name": "calls",
          "descriptor": "I",
          "flags": 0
        }
      ],
      "attributeDigest": "574d3dd12ace3044e0585ec416ab3c7e4a5a330ee548425566d6b03d53da835f",
      "bootstrapDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
      "methods": [
        {
          "name": "<init>",
          "descriptor": "()V",
          "flags": 2,
          "instructionDigest": "d52b2cdaac7f84e046ef9b123b79dc446ea8c5767dc48b74c8550ffeb2f9dcb0"
        },
        {
          "name": "name",
          "descriptor": "()Ljava/lang/String;",
          "flags": 1,
          "instructionDigest": "e4b07658d2347c5b94bd59f6dbbdf443457471b5ee7a3d44379262b8d3f0e290"
        },
        {
          "name": "stability",
          "descriptor": "()Ljava/lang/classfile/AttributeMapper$AttributeStability;",
          "flags": 1,
          "instructionDigest": "b49f62ce8156197e38a15edffe1c7e7da29942439eea507abfea9bf1b43b6905"
        },
        {
          "name": "allowMultiple",
          "descriptor": "()Z",
          "flags": 1,
          "instructionDigest": "f125fc9b63ee2db9e551adf4be57a5a885c61a73cd44aafd7a71218f2eceb2b1"
        },
        {
          "name": "readAttribute",
          "descriptor": "(Ljava/lang/classfile/AttributedElement;Ljava/lang/classfile/ClassReader;I)Lclasses/modern_test/ClassFileVerifierPhaseRegression$ParserAttribute;",
          "flags": 1,
          "instructionDigest": "86f9c5ceff212a2e1fdabfe078b5638947d4ebe9676f079ba9f0b15f30a293d5"
        },
        {
          "name": "writeAttribute",
          "descriptor": "(Ljava/lang/classfile/BufWriter;Lclasses/modern_test/ClassFileVerifierPhaseRegression$ParserAttribute;)V",
          "flags": 1,
          "instructionDigest": "7e17a24e35ad64d08cae00fef674b1b80150d2dbf9c9f139c17dec8503ff16ab"
        },
        {
          "name": "writeAttribute",
          "descriptor": "(Ljava/lang/classfile/BufWriter;Ljava/lang/classfile/Attribute;)V",
          "flags": 4161,
          "instructionDigest": "42467cf25d379b5adad3f76af8630b99b7cb06991a1707f731de717abd88ab27"
        },
        {
          "name": "readAttribute",
          "descriptor": "(Ljava/lang/classfile/AttributedElement;Ljava/lang/classfile/ClassReader;I)Ljava/lang/classfile/Attribute;",
          "flags": 4161,
          "instructionDigest": "24ff65d0cb788a9b9fc9ced33783e9e9b167aa3fc28a5783ce3da8e9ed9ff8d8"
        }
      ]
    },
    {
      "className": "classes.modern_test.ClassFileVerifierPhaseRegression",
      "flags": 49,
      "superclass": "java.lang.Object",
      "interfaces": [],
      "fields": [
        {
          "name": "PUBLIC_STATIC",
          "descriptor": "I",
          "flags": 26
        },
        {
          "name": "INFERENCE",
          "descriptor": "Ljava/lang/String;",
          "flags": 26
        },
        {
          "name": "NUMBER",
          "descriptor": "Ljava/lang/constant/ClassDesc;",
          "flags": 26
        },
        {
          "name": "major",
          "descriptor": "I",
          "flags": 10
        },
        {
          "name": "recipe",
          "descriptor": "I",
          "flags": 10
        },
        {
          "name": "methodFlags",
          "descriptor": "I",
          "flags": 10
        },
        {
          "name": "completed",
          "descriptor": "I",
          "flags": 10
        },
        {
          "name": "artifacts",
          "descriptor": "I",
          "flags": 10
        },
        {
          "name": "parserDefect",
          "descriptor": "Z",
          "flags": 10
        }
      ],
      "attributeDigest": "ab1e387c1abd42c3dd115d9ce0835be3bc7b86d6a4ca624e01fc784eff6a28df",
      "bootstrapDigest": "83beac93a5ecb8336b70636e4ea2a278b349c29136d09fe8c288590b3e92770c",
      "methods": [
        {
          "name": "<init>",
          "descriptor": "()V",
          "flags": 1,
          "instructionDigest": "61277a5e357118f28df66077d7f68f413c30d94863855ece70b09fb1fb01faf7"
        },
        {
          "name": "require",
          "descriptor": "(ZLjava/lang/String;)V",
          "flags": 10,
          "instructionDigest": "f8d1a910b55b2e32edb482d56d8e512db626a8f843f67b59ddcf8a12975b0e2a"
        },
        {
          "name": "api",
          "descriptor": "()Ljava/lang/classfile/ClassFile;",
          "flags": 10,
          "instructionDigest": "b878fe7af1c5baa14e4f7e245f6e4e3973484a663c2b3371d8fc9f6232d1f4fe"
        },
        {
          "name": "owner",
          "descriptor": "(Ljava/lang/String;)Ljava/lang/constant/ClassDesc;",
          "flags": 10,
          "instructionDigest": "37db3dc12ea28bf598747924605853bfd29f5c9fa902573ce1a76b807fda4673"
        },
        {
          "name": "badConstantField",
          "descriptor": "(Ljava/lang/classfile/ClassBuilder;)V",
          "flags": 10,
          "instructionDigest": "05a852db86892f6cf9a71706aa5e412860bb92e0abf4230a2d3e6c3a1d5f07e6"
        },
        {
          "name": "codeValid",
          "descriptor": "(Ljava/lang/classfile/CodeBuilder;)V",
          "flags": 10,
          "instructionDigest": "3168c3fce901494688720e47ce3b7d7a0fa29e805301438f7b1fc8f2fb9c6b1e"
        },
        {
          "name": "codeUnderflow",
          "descriptor": "(Ljava/lang/classfile/CodeBuilder;)V",
          "flags": 10,
          "instructionDigest": "7e71f93c3fec389654ddadf2a1497b5370774095e7fe7080fc2a9f680146a6cb"
        },
        {
          "name": "codeWrongReturn",
          "descriptor": "(Ljava/lang/classfile/CodeBuilder;)V",
          "flags": 10,
          "instructionDigest": "8ec35e743993bf9a956c17be57f5d91440c7571f7e5261e71d9300b47440c437"
        },
        {
          "name": "codeDebug",
          "descriptor": "(Ljava/lang/classfile/CodeBuilder;)V",
          "flags": 10,
          "instructionDigest": "063e1681e0377203532ae6a301e0faf6ce5bd1a65eeddb5b4e4d02aacb63dfdc"
        },
        {
          "name": "codeJsr",
          "descriptor": "(Ljava/lang/classfile/CodeBuilder;)V",
          "flags": 10,
          "instructionDigest": "9a349ae8b05aee75cd6dde4df03db4c1aa938447e72accfcbdca9e20aa58511c"
        },
        {
          "name": "codeReference",
          "descriptor": "(Ljava/lang/classfile/CodeBuilder;)V",
          "flags": 10,
          "instructionDigest": "56542b4c3cf16e8b70f70570e2cbe8761c364b2f2aa4e52f7fc1e9e7bd806d37"
        },
        {
          "name": "buildSingle",
          "descriptor": "(Ljava/lang/classfile/ClassBuilder;)V",
          "flags": 10,
          "instructionDigest": "80d62e25f38266e3be58503c198c125cd8855654fb3c0eeeabeb8b93b3681730"
        },
        {
          "name": "single",
          "descriptor": "(Ljava/lang/String;IIIZ)[B",
          "flags": 10,
          "instructionDigest": "78773bb7820ae56fe9a65485a043880d80093293e7009dc9c6585a6d0fa652fc"
        },
        {
          "name": "buildMultiple",
          "descriptor": "(Ljava/lang/classfile/ClassBuilder;)V",
          "flags": 10,
          "instructionDigest": "93e2431ee8aecde4aebe1aecfeba72d06769397747471161614f6137893838e2"
        },
        {
          "name": "multiple",
          "descriptor": "(Ljava/lang/String;IZZZ)[B",
          "flags": 10,
          "instructionDigest": "24af85f4f41f05d86ff7c3e6d9fca123779d3eb64bceffb05d08b707b25dfb48"
        },
        {
          "name": "category",
          "descriptor": "(Ljava/lang/VerifyError;)Ljava/lang/String;",
          "flags": 10,
          "instructionDigest": "a40b75fdf734410cf2f0fa38a2e2f15f0e1219335d292dbf0578a5603ff74ece"
        },
        {
          "name": "categories",
          "descriptor": "(Ljava/util/List;Z)Ljava/util/List;",
          "flags": 10,
          "instructionDigest": "9383ef456e1519417cade4ae53190f1707d5ba71c130a147e602e727390f56cc"
        },
        {
          "name": "joined",
          "descriptor": "(Ljava/util/List;)Ljava/lang/String;",
          "flags": 10,
          "instructionDigest": "307e8c8385942708ed15a808980f98d3723ac06442893439907c0451e7ab7212"
        },
        {
          "name": "immutable",
          "descriptor": "(Ljava/util/List;)V",
          "flags": 10,
          "instructionDigest": "cbd8a4d70eb529a52ca8d3ab3b9c90d82f560f7da3547cd21c0834fa14f61f69"
        },
        {
          "name": "outcome",
          "descriptor": "(Ljava/lang/String;Ljava/lang/classfile/ClassFile;[B[Ljava/lang/String;)V",
          "flags": 138,
          "instructionDigest": "d544290362d23c80a1bbf6246faf7586269702b3599df61b4f5b6beb0d8b2d06"
        },
        {
          "name": "u2",
          "descriptor": "([BI)I",
          "flags": 10,
          "instructionDigest": "cfae177db63f914a48a75079e73561285b19e35af97ba367f319f2ff0b0d2c79"
        },
        {
          "name": "u4",
          "descriptor": "([BI)I",
          "flags": 10,
          "instructionDigest": "8ebbf1900ed87afe5960913164248480494c8a08c72d0be43fe20db8c4235ff1"
        },
        {
          "name": "nextAttribute",
          "descriptor": "([BI)I",
          "flags": 10,
          "instructionDigest": "61c74c3e9019f19615f936abfd73091e1fd99b0f7526160243d70777b3711f1a"
        },
        {
          "name": "locate",
          "descriptor": "([BLjava/lang/String;)I",
          "flags": 10,
          "instructionDigest": "8f356c9e7393541e8368ff508ea8847ff1dbe05c08c03b2b021608af7ab18bce"
        },
        {
          "name": "change",
          "descriptor": "([BLjava/lang/String;III)[B",
          "flags": 10,
          "instructionDigest": "9fb8b5101bd1de3bc6992209592760602b3d0fd306e48ed66ce9d1855daa0b28"
        },
        {
          "name": "versions",
          "descriptor": "()V",
          "flags": 10,
          "instructionDigest": "fc3dd83aa77b31ffc2e7f5a545d5e36297554bd9c2c8d3a0efadf9801794c712"
        },
        {
          "name": "bridgesAndFlags",
          "descriptor": "()V",
          "flags": 10,
          "instructionDigest": "a98c84c94dc5f3e102c97fd7eaeb20e4524cd799fd566f1c08b21a657a84ab1c"
        },
        {
          "name": "multipleErrors",
          "descriptor": "()V",
          "flags": 10,
          "instructionDigest": "e81535c387619437e5e5c57608c491bcbd3f925c7fa9294b7108ca21cb0120a9"
        },
        {
          "name": "discontinued",
          "descriptor": "()V",
          "flags": 10,
          "instructionDigest": "38b7bfd3bc08693f52ec50c7c29f62856a8bb313ee24a99ece98adebbb43e7d5"
        },
        {
          "name": "excludedOwners",
          "descriptor": "()V",
          "flags": 10,
          "instructionDigest": "cbb4cfed66f70692c3a3ff99ec068986e68cb40add2f8a6971d2bf4ffab0c3e0"
        },
        {
          "name": "buildResolver",
          "descriptor": "(Ljava/lang/classfile/ClassBuilder;)V",
          "flags": 10,
          "instructionDigest": "d9f0917dbd379b12f25c22d8a1015c121f737d4614a292a4849153daca970871"
        },
        {
          "name": "resolvers",
          "descriptor": "()V",
          "flags": 10,
          "instructionDigest": "4e2b45d2b8bd87ed207609b1d009a8804d11fdd893a6bc752d336a07e9d80626"
        },
        {
          "name": "callbackArtifact",
          "descriptor": "(Ljava/lang/String;[BLjava/lang/String;Ljava/lang/String;)V",
          "flags": 10,
          "instructionDigest": "f42e6842879f0763772662f14b5cd7cf336bd18a4c4ed136ce802c5e1f473807"
        },
        {
          "name": "parserCallbacks",
          "descriptor": "()V",
          "flags": 10,
          "instructionDigest": "c3c520126544f006548ec59f0df142d660eb935cd7147f30dfc16ee5af80d3e4"
        },
        {
          "name": "codeJsrLvt",
          "descriptor": "(Ljava/lang/classfile/CodeBuilder;)V",
          "flags": 10,
          "instructionDigest": "5f3ecf4ab3f58c88c8c869fdd570304bde9d09a8b81ffa77b839a90d8cd3e635"
        },
        {
          "name": "buildJsrLvt",
          "descriptor": "(Ljava/lang/classfile/ClassBuilder;)V",
          "flags": 10,
          "instructionDigest": "61acaf2c8189c262d4346aaaa48d168629d7c7b98c9e1e2baf0848f7c5143d2f"
        },
        {
          "name": "jsrLvtOrdering",
          "descriptor": "()V",
          "flags": 10,
          "instructionDigest": "6b83095dba408eb51ce49cf16a1129dc6a113377266a89db6a822debe9c7c1cd"
        },
        {
          "name": "buildObjectConstructor",
          "descriptor": "(Ljava/lang/classfile/ClassBuilder;)V",
          "flags": 10,
          "instructionDigest": "3b8e72bef9dd36e86a3367c7a2283d1e17304174b5c5d37b7a4d7bbff7dafebd"
        },
        {
          "name": "objectConstructors",
          "descriptor": "()V",
          "flags": 10,
          "instructionDigest": "ec3ca67091c4b5927471c4a154f3d215092b033e3b9ee1212bf61a1add366d71"
        },
        {
          "name": "parserNameOrder",
          "descriptor": "()V",
          "flags": 10,
          "instructionDigest": "f6eac0ae7a893e5e9b283811006c66bc4ea4635136d32c16ab6758f0a3111f4b"
        },
        {
          "name": "main",
          "descriptor": "([Ljava/lang/String;)V",
          "flags": 9,
          "instructionDigest": "b2469e3c11ec63cb89a259016b533d3ab522e6c65e4710c5a9c4484e4f761b87"
        },
        {
          "name": "lambda$parserNameOrder$1",
          "descriptor": "(Lclasses/modern_test/ClassFileVerifierPhaseRegression$NamedParserMapper;Ljava/lang/classfile/ClassBuilder;)V",
          "flags": 4106,
          "instructionDigest": "c6364c17604f65776c655a5ac179dee9586361755f6c4580b43e10c41d24dc0d"
        },
        {
          "name": "lambda$parserNameOrder$0",
          "descriptor": "(Lclasses/modern_test/ClassFileVerifierPhaseRegression$NamedParserMapper;Ljava/lang/classfile/constantpool/Utf8Entry;)Ljava/lang/classfile/AttributeMapper;",
          "flags": 4106,
          "instructionDigest": "7e68b56de6c4c1dbc673f13d2dc505e46ffd29b1a8742fc5e2195690bd38c718"
        },
        {
          "name": "lambda$parserCallbacks$1",
          "descriptor": "(Lclasses/modern_test/ClassFileVerifierPhaseRegression$ParserMapper;ILjava/lang/classfile/ClassBuilder;)V",
          "flags": 4106,
          "instructionDigest": "14c290a3662512a88caa5b9060cd6909fabeb153454b8a8402c8f79e4b299498"
        },
        {
          "name": "lambda$parserCallbacks$0",
          "descriptor": "(Lclasses/modern_test/ClassFileVerifierPhaseRegression$ParserMapper;Ljava/lang/classfile/constantpool/Utf8Entry;)Ljava/lang/classfile/AttributeMapper;",
          "flags": 4106,
          "instructionDigest": "f2186a7dac266f00ee05bb0e1b2bce63ef69a818271a05d547ef0ba49fb4aa35"
        },
        {
          "name": "lambda$resolvers$1",
          "descriptor": "([ILjava/lang/constant/ClassDesc;)Ljava/lang/classfile/ClassHierarchyResolver$ClassHierarchyInfo;",
          "flags": 4106,
          "instructionDigest": "be8c981f37e2f39acf6bc3a67e69cf8c18c8016b9c9fab03521ab1e9e5a1b648"
        },
        {
          "name": "lambda$resolvers$0",
          "descriptor": "([IILjava/lang/constant/ClassDesc;)Ljava/lang/classfile/ClassHierarchyResolver$ClassHierarchyInfo;",
          "flags": 4106,
          "instructionDigest": "168fd76b0537523e35d83092118bde5d930d057f05365730f7655f10bbeb2810"
        },
        {
          "name": "lambda$buildSingle$0",
          "descriptor": "(Ljava/lang/classfile/MethodBuilder;)V",
          "flags": 4106,
          "instructionDigest": "157e786b6cd78d183b930922aedda394ab05782e9b6e8bd3650a300f04a450e8"
        },
        {
          "name": "lambda$badConstantField$0",
          "descriptor": "(Ljava/lang/classfile/FieldBuilder;)V",
          "flags": 4106,
          "instructionDigest": "1b230efc8f3e864686b9d4dc0358b09cc9a8b56a320e239e32451501bc3ee94c"
        },
        {
          "name": "<clinit>",
          "descriptor": "()V",
          "flags": 8,
          "instructionDigest": "598c0099e4c62102944d15fd277b5ec47d906d81144ab1c6fb45e1f9b49372a8"
        }
      ]
    }
  ],
  "arrayRoutes": [
    {
      "method": "outcome",
      "descriptor": "(Ljava/lang/String;Ljava/lang/classfile/ClassFile;[B[Ljava/lang/String;)V",
      "byteArrayParameter": 2,
      "calls": [
        {
          "pc": 27,
          "owner": "java.lang.classfile.ClassFile",
          "name": "verify",
          "descriptor": "([B)Ljava/util/List;",
          "byteArrayLoadPc": 26
        },
        {
          "pc": 36,
          "owner": "java.lang.classfile.ClassFile",
          "name": "parse",
          "descriptor": "([B)Ljava/lang/classfile/ClassModel;",
          "byteArrayLoadPc": 35
        },
        {
          "pc": 46,
          "owner": "java.lang.classfile.ClassFile",
          "name": "verify",
          "descriptor": "(Ljava/lang/classfile/ClassModel;)Ljava/util/List;"
        },
        {
          "pc": 168,
          "owner": "java.util.Base64$Encoder",
          "name": "encodeToString",
          "descriptor": "([B)Ljava/lang/String;",
          "byteArrayLoadPc": 167
        }
      ]
    },
    {
      "method": "callbackArtifact",
      "descriptor": "(Ljava/lang/String;[BLjava/lang/String;Ljava/lang/String;)V",
      "byteArrayParameter": 1,
      "calls": [
        {
          "pc": 9,
          "owner": "java.util.Base64$Encoder",
          "name": "encodeToString",
          "descriptor": "([B)Ljava/lang/String;",
          "byteArrayLoadPc": 8
        }
      ]
    },
    {
      "method": "parserCallbacks",
      "descriptor": "()V",
      "byteArrayLocal": 7,
      "byteArrayStorePc": 113,
      "calls": [
        {
          "pc": 119,
          "owner": "java.lang.classfile.ClassFile",
          "name": "parse",
          "descriptor": "([B)Ljava/lang/classfile/ClassModel;",
          "byteArrayLoadPc": 117
        },
        {
          "pc": 175,
          "owner": "java.lang.classfile.ClassFile",
          "name": "verify",
          "descriptor": "([B)Ljava/util/List;",
          "byteArrayLoadPc": 173
        },
        {
          "pc": 219,
          "owner": "java.lang.classfile.ClassFile",
          "name": "verify",
          "descriptor": "(Ljava/lang/classfile/ClassModel;)Ljava/util/List;"
        },
        {
          "pc": 289,
          "owner": "classes.modern_test.ClassFileVerifierPhaseRegression",
          "name": "callbackArtifact",
          "descriptor": "(Ljava/lang/String;[BLjava/lang/String;Ljava/lang/String;)V",
          "byteArrayLoadPc": 281
        },
        {
          "pc": 299,
          "owner": "java.lang.classfile.ClassFile",
          "name": "verify",
          "descriptor": "([B)Ljava/util/List;",
          "byteArrayLoadPc": 297
        },
        {
          "pc": 310,
          "owner": "java.lang.classfile.ClassFile",
          "name": "verify",
          "descriptor": "(Ljava/lang/classfile/ClassModel;)Ljava/util/List;"
        },
        {
          "pc": 519,
          "owner": "classes.modern_test.ClassFileVerifierPhaseRegression",
          "name": "callbackArtifact",
          "descriptor": "(Ljava/lang/String;[BLjava/lang/String;Ljava/lang/String;)V",
          "byteArrayLoadPc": 511
        }
      ]
    },
    {
      "method": "parserNameOrder",
      "descriptor": "()V",
      "byteArrayLocal": 7,
      "byteArrayStorePc": 121,
      "calls": [
        {
          "pc": 127,
          "owner": "java.lang.classfile.ClassFile",
          "name": "parse",
          "descriptor": "([B)Ljava/lang/classfile/ClassModel;",
          "byteArrayLoadPc": 125
        },
        {
          "pc": 185,
          "owner": "java.lang.classfile.ClassFile",
          "name": "verify",
          "descriptor": "([B)Ljava/util/List;",
          "byteArrayLoadPc": 183
        },
        {
          "pc": 229,
          "owner": "java.lang.classfile.ClassFile",
          "name": "verify",
          "descriptor": "(Ljava/lang/classfile/ClassModel;)Ljava/util/List;"
        },
        {
          "pc": 307,
          "owner": "classes.modern_test.ClassFileVerifierPhaseRegression",
          "name": "callbackArtifact",
          "descriptor": "(Ljava/lang/String;[BLjava/lang/String;Ljava/lang/String;)V",
          "byteArrayLoadPc": 299
        },
        {
          "pc": 317,
          "owner": "java.lang.classfile.ClassFile",
          "name": "verify",
          "descriptor": "([B)Ljava/util/List;",
          "byteArrayLoadPc": 315
        },
        {
          "pc": 328,
          "owner": "java.lang.classfile.ClassFile",
          "name": "verify",
          "descriptor": "(Ljava/lang/classfile/ClassModel;)Ljava/util/List;"
        },
        {
          "pc": 613,
          "owner": "classes.modern_test.ClassFileVerifierPhaseRegression",
          "name": "callbackArtifact",
          "descriptor": "(Ljava/lang/String;[BLjava/lang/String;Ljava/lang/String;)V",
          "byteArrayLoadPc": 593
        }
      ]
    }
  ],
  "completionMarker": "CLASSFILE_VERIFIER_PHASE_REGRESSION_OK|cases=65|artifacts=65"
});
export const verifierPhaseCases=freeze([
  {
    "id": "phase-v49-valid",
    "event": "inference;byte/model=equal;list=immutable;definition=never",
    "profileLine": "PROFILE|phase-v49-valid|major=49|bytes=1|model=1|categories=inference",
    "categories": [
      "inference"
    ],
    "messageCount": 1,
    "messageCategories": [
      "inference"
    ],
    "initializationDebug": false,
    "parserArgumentCallback": false,
    "sourceGroup": "versions",
    "sourceGroupDescriptor": "()V",
    "outputOrder": [
      "artifact",
      "profile",
      "message",
      "case"
    ],
    "artifacts": [
      {
        "id": "phase-v49-valid",
        "definition": "never-define",
        "profile": {
          "className": "classes.modern_test.Phase_phase_v49_valid",
          "major": 49,
          "minor": 0,
          "flags": 33,
          "superclass": "java.lang.Object",
          "interfaces": [],
          "fields": [],
          "methods": [
            {
              "name": "value",
              "descriptor": "()I",
              "flags": 9,
              "metadata": [],
              "code": {
                "maxStack": 1,
                "maxLocals": 0,
                "codeLength": 3,
                "operations": [
                  {
                    "pc": 0,
                    "opcode": "bipush",
                    "length": 2,
                    "value": 7
                  },
                  {
                    "pc": 2,
                    "opcode": "ireturn",
                    "length": 1
                  }
                ],
                "handlers": [],
                "attributes": []
              }
            }
          ],
          "attributes": []
        }
      }
    ]
  },
  {
    "id": "phase-v49-ordinary-bad",
    "event": "inference;byte/model=equal;list=immutable;definition=never",
    "profileLine": "PROFILE|phase-v49-ordinary-bad|major=49|bytes=1|model=1|categories=inference",
    "categories": [
      "inference"
    ],
    "messageCount": 1,
    "messageCategories": [
      "inference"
    ],
    "initializationDebug": false,
    "parserArgumentCallback": false,
    "sourceGroup": "versions",
    "sourceGroupDescriptor": "()V",
    "outputOrder": [
      "artifact",
      "profile",
      "message",
      "case"
    ],
    "artifacts": [
      {
        "id": "phase-v49-ordinary-bad",
        "definition": "never-define",
        "profile": {
          "className": "classes.modern_test.Phase_phase_v49_ordinary_bad",
          "major": 49,
          "minor": 0,
          "flags": 33,
          "superclass": "java.lang.Object",
          "interfaces": [],
          "fields": [],
          "methods": [
            {
              "name": "value",
              "descriptor": "()I",
              "flags": 9,
              "metadata": [],
              "code": {
                "maxStack": 0,
                "maxLocals": 0,
                "codeLength": 1,
                "operations": [
                  {
                    "pc": 0,
                    "opcode": "ireturn",
                    "length": 1
                  }
                ],
                "handlers": [],
                "attributes": []
              }
            }
          ],
          "attributes": []
        }
      }
    ]
  },
  {
    "id": "phase-v49-bridge-bad",
    "event": "inference;byte/model=equal;list=immutable;definition=never",
    "profileLine": "PROFILE|phase-v49-bridge-bad|major=49|bytes=1|model=1|categories=inference",
    "categories": [
      "inference"
    ],
    "messageCount": 1,
    "messageCategories": [
      "inference"
    ],
    "initializationDebug": false,
    "parserArgumentCallback": false,
    "sourceGroup": "versions",
    "sourceGroupDescriptor": "()V",
    "outputOrder": [
      "artifact",
      "profile",
      "message",
      "case"
    ],
    "artifacts": [
      {
        "id": "phase-v49-bridge-bad",
        "definition": "never-define",
        "profile": {
          "className": "classes.modern_test.Phase_phase_v49_bridge_bad",
          "major": 49,
          "minor": 0,
          "flags": 33,
          "superclass": "java.lang.Object",
          "interfaces": [],
          "fields": [],
          "methods": [
            {
              "name": "value",
              "descriptor": "()I",
              "flags": 73,
              "metadata": [],
              "code": {
                "maxStack": 0,
                "maxLocals": 0,
                "codeLength": 1,
                "operations": [
                  {
                    "pc": 0,
                    "opcode": "ireturn",
                    "length": 1
                  }
                ],
                "handlers": [],
                "attributes": []
              }
            }
          ],
          "attributes": []
        }
      }
    ]
  },
  {
    "id": "phase-v49-parser-bridge",
    "event": "parser-constant,inference;byte/model=equal;list=immutable;definition=never",
    "profileLine": "PROFILE|phase-v49-parser-bridge|major=49|bytes=2|model=2|categories=parser-constant,inference",
    "categories": [
      "parser-constant",
      "inference"
    ],
    "messageCount": 2,
    "messageCategories": [
      "parser-constant",
      "inference"
    ],
    "initializationDebug": false,
    "parserArgumentCallback": false,
    "sourceGroup": "versions",
    "sourceGroupDescriptor": "()V",
    "outputOrder": [
      "artifact",
      "profile",
      "message",
      "message",
      "case"
    ],
    "artifacts": [
      {
        "id": "phase-v49-parser-bridge",
        "definition": "never-define",
        "profile": {
          "className": "classes.modern_test.Phase_phase_v49_parser_bridge",
          "major": 49,
          "minor": 0,
          "flags": 33,
          "superclass": "java.lang.Object",
          "interfaces": [],
          "fields": [
            {
              "name": "wrongConstant",
              "descriptor": "Ljava/lang/String;",
              "flags": 25,
              "attributes": [
                {
                  "name": "ConstantValue",
                  "contents": {
                    "tag": 3,
                    "value": 7
                  }
                }
              ]
            }
          ],
          "methods": [
            {
              "name": "value",
              "descriptor": "()I",
              "flags": 73,
              "metadata": [],
              "code": {
                "maxStack": 0,
                "maxLocals": 0,
                "codeLength": 1,
                "operations": [
                  {
                    "pc": 0,
                    "opcode": "ireturn",
                    "length": 1
                  }
                ],
                "handlers": [],
                "attributes": []
              }
            }
          ],
          "attributes": []
        }
      }
    ]
  },
  {
    "id": "phase-v50-valid",
    "event": "empty;byte/model=equal;list=immutable;definition=never",
    "profileLine": "PROFILE|phase-v50-valid|major=50|bytes=0|model=0|categories=empty",
    "categories": [],
    "messageCount": 0,
    "messageCategories": [],
    "initializationDebug": false,
    "parserArgumentCallback": false,
    "sourceGroup": "versions",
    "sourceGroupDescriptor": "()V",
    "outputOrder": [
      "artifact",
      "profile",
      "case"
    ],
    "artifacts": [
      {
        "id": "phase-v50-valid",
        "definition": "never-define",
        "profile": {
          "className": "classes.modern_test.Phase_phase_v50_valid",
          "major": 50,
          "minor": 0,
          "flags": 33,
          "superclass": "java.lang.Object",
          "interfaces": [],
          "fields": [],
          "methods": [
            {
              "name": "value",
              "descriptor": "()I",
              "flags": 9,
              "metadata": [],
              "code": {
                "maxStack": 1,
                "maxLocals": 0,
                "codeLength": 3,
                "operations": [
                  {
                    "pc": 0,
                    "opcode": "bipush",
                    "length": 2,
                    "value": 7
                  },
                  {
                    "pc": 2,
                    "opcode": "ireturn",
                    "length": 1
                  }
                ],
                "handlers": [],
                "attributes": []
              }
            }
          ],
          "attributes": []
        }
      }
    ]
  },
  {
    "id": "phase-v50-ordinary-bad",
    "event": "inference;byte/model=equal;list=immutable;definition=never",
    "profileLine": "PROFILE|phase-v50-ordinary-bad|major=50|bytes=1|model=1|categories=inference",
    "categories": [
      "inference"
    ],
    "messageCount": 1,
    "messageCategories": [
      "inference"
    ],
    "initializationDebug": false,
    "parserArgumentCallback": false,
    "sourceGroup": "versions",
    "sourceGroupDescriptor": "()V",
    "outputOrder": [
      "artifact",
      "profile",
      "message",
      "case"
    ],
    "artifacts": [
      {
        "id": "phase-v50-ordinary-bad",
        "definition": "never-define",
        "profile": {
          "className": "classes.modern_test.Phase_phase_v50_ordinary_bad",
          "major": 50,
          "minor": 0,
          "flags": 33,
          "superclass": "java.lang.Object",
          "interfaces": [],
          "fields": [],
          "methods": [
            {
              "name": "value",
              "descriptor": "()I",
              "flags": 9,
              "metadata": [],
              "code": {
                "maxStack": 0,
                "maxLocals": 0,
                "codeLength": 1,
                "operations": [
                  {
                    "pc": 0,
                    "opcode": "ireturn",
                    "length": 1
                  }
                ],
                "handlers": [],
                "attributes": []
              }
            }
          ],
          "attributes": []
        }
      }
    ]
  },
  {
    "id": "phase-v50-bridge-bad",
    "event": "empty;byte/model=equal;list=immutable;definition=never",
    "profileLine": "PROFILE|phase-v50-bridge-bad|major=50|bytes=0|model=0|categories=empty",
    "categories": [],
    "messageCount": 0,
    "messageCategories": [],
    "initializationDebug": false,
    "parserArgumentCallback": false,
    "sourceGroup": "versions",
    "sourceGroupDescriptor": "()V",
    "outputOrder": [
      "artifact",
      "profile",
      "case"
    ],
    "artifacts": [
      {
        "id": "phase-v50-bridge-bad",
        "definition": "never-define",
        "profile": {
          "className": "classes.modern_test.Phase_phase_v50_bridge_bad",
          "major": 50,
          "minor": 0,
          "flags": 33,
          "superclass": "java.lang.Object",
          "interfaces": [],
          "fields": [],
          "methods": [
            {
              "name": "value",
              "descriptor": "()I",
              "flags": 73,
              "metadata": [],
              "code": {
                "maxStack": 0,
                "maxLocals": 0,
                "codeLength": 1,
                "operations": [
                  {
                    "pc": 0,
                    "opcode": "ireturn",
                    "length": 1
                  }
                ],
                "handlers": [],
                "attributes": []
              }
            }
          ],
          "attributes": []
        }
      }
    ]
  },
  {
    "id": "phase-v50-parser-bridge",
    "event": "parser-constant;byte/model=equal;list=immutable;definition=never",
    "profileLine": "PROFILE|phase-v50-parser-bridge|major=50|bytes=1|model=1|categories=parser-constant",
    "categories": [
      "parser-constant"
    ],
    "messageCount": 1,
    "messageCategories": [
      "parser-constant"
    ],
    "initializationDebug": false,
    "parserArgumentCallback": false,
    "sourceGroup": "versions",
    "sourceGroupDescriptor": "()V",
    "outputOrder": [
      "artifact",
      "profile",
      "message",
      "case"
    ],
    "artifacts": [
      {
        "id": "phase-v50-parser-bridge",
        "definition": "never-define",
        "profile": {
          "className": "classes.modern_test.Phase_phase_v50_parser_bridge",
          "major": 50,
          "minor": 0,
          "flags": 33,
          "superclass": "java.lang.Object",
          "interfaces": [],
          "fields": [
            {
              "name": "wrongConstant",
              "descriptor": "Ljava/lang/String;",
              "flags": 25,
              "attributes": [
                {
                  "name": "ConstantValue",
                  "contents": {
                    "tag": 3,
                    "value": 7
                  }
                }
              ]
            }
          ],
          "methods": [
            {
              "name": "value",
              "descriptor": "()I",
              "flags": 73,
              "metadata": [],
              "code": {
                "maxStack": 0,
                "maxLocals": 0,
                "codeLength": 1,
                "operations": [
                  {
                    "pc": 0,
                    "opcode": "ireturn",
                    "length": 1
                  }
                ],
                "handlers": [],
                "attributes": []
              }
            }
          ],
          "attributes": []
        }
      }
    ]
  },
  {
    "id": "phase-v51-valid",
    "event": "empty;byte/model=equal;list=immutable;definition=never",
    "profileLine": "PROFILE|phase-v51-valid|major=51|bytes=0|model=0|categories=empty",
    "categories": [],
    "messageCount": 0,
    "messageCategories": [],
    "initializationDebug": false,
    "parserArgumentCallback": false,
    "sourceGroup": "versions",
    "sourceGroupDescriptor": "()V",
    "outputOrder": [
      "artifact",
      "profile",
      "case"
    ],
    "artifacts": [
      {
        "id": "phase-v51-valid",
        "definition": "never-define",
        "profile": {
          "className": "classes.modern_test.Phase_phase_v51_valid",
          "major": 51,
          "minor": 0,
          "flags": 33,
          "superclass": "java.lang.Object",
          "interfaces": [],
          "fields": [],
          "methods": [
            {
              "name": "value",
              "descriptor": "()I",
              "flags": 9,
              "metadata": [],
              "code": {
                "maxStack": 1,
                "maxLocals": 0,
                "codeLength": 3,
                "operations": [
                  {
                    "pc": 0,
                    "opcode": "bipush",
                    "length": 2,
                    "value": 7
                  },
                  {
                    "pc": 2,
                    "opcode": "ireturn",
                    "length": 1
                  }
                ],
                "handlers": [],
                "attributes": []
              }
            }
          ],
          "attributes": []
        }
      }
    ]
  },
  {
    "id": "phase-v51-ordinary-bad",
    "event": "byte-underflow;byte/model=equal;list=immutable;definition=never",
    "profileLine": "PROFILE|phase-v51-ordinary-bad|major=51|bytes=1|model=1|categories=byte-underflow",
    "categories": [
      "byte-underflow"
    ],
    "messageCount": 1,
    "messageCategories": [
      "byte-underflow"
    ],
    "initializationDebug": false,
    "parserArgumentCallback": false,
    "sourceGroup": "versions",
    "sourceGroupDescriptor": "()V",
    "outputOrder": [
      "artifact",
      "profile",
      "message",
      "case"
    ],
    "artifacts": [
      {
        "id": "phase-v51-ordinary-bad",
        "definition": "never-define",
        "profile": {
          "className": "classes.modern_test.Phase_phase_v51_ordinary_bad",
          "major": 51,
          "minor": 0,
          "flags": 33,
          "superclass": "java.lang.Object",
          "interfaces": [],
          "fields": [],
          "methods": [
            {
              "name": "value",
              "descriptor": "()I",
              "flags": 9,
              "metadata": [],
              "code": {
                "maxStack": 0,
                "maxLocals": 0,
                "codeLength": 1,
                "operations": [
                  {
                    "pc": 0,
                    "opcode": "ireturn",
                    "length": 1
                  }
                ],
                "handlers": [],
                "attributes": []
              }
            }
          ],
          "attributes": []
        }
      }
    ]
  },
  {
    "id": "phase-v51-bridge-bad",
    "event": "empty;byte/model=equal;list=immutable;definition=never",
    "profileLine": "PROFILE|phase-v51-bridge-bad|major=51|bytes=0|model=0|categories=empty",
    "categories": [],
    "messageCount": 0,
    "messageCategories": [],
    "initializationDebug": false,
    "parserArgumentCallback": false,
    "sourceGroup": "versions",
    "sourceGroupDescriptor": "()V",
    "outputOrder": [
      "artifact",
      "profile",
      "case"
    ],
    "artifacts": [
      {
        "id": "phase-v51-bridge-bad",
        "definition": "never-define",
        "profile": {
          "className": "classes.modern_test.Phase_phase_v51_bridge_bad",
          "major": 51,
          "minor": 0,
          "flags": 33,
          "superclass": "java.lang.Object",
          "interfaces": [],
          "fields": [],
          "methods": [
            {
              "name": "value",
              "descriptor": "()I",
              "flags": 73,
              "metadata": [],
              "code": {
                "maxStack": 0,
                "maxLocals": 0,
                "codeLength": 1,
                "operations": [
                  {
                    "pc": 0,
                    "opcode": "ireturn",
                    "length": 1
                  }
                ],
                "handlers": [],
                "attributes": []
              }
            }
          ],
          "attributes": []
        }
      }
    ]
  },
  {
    "id": "phase-v51-parser-bridge",
    "event": "parser-constant;byte/model=equal;list=immutable;definition=never",
    "profileLine": "PROFILE|phase-v51-parser-bridge|major=51|bytes=1|model=1|categories=parser-constant",
    "categories": [
      "parser-constant"
    ],
    "messageCount": 1,
    "messageCategories": [
      "parser-constant"
    ],
    "initializationDebug": false,
    "parserArgumentCallback": false,
    "sourceGroup": "versions",
    "sourceGroupDescriptor": "()V",
    "outputOrder": [
      "artifact",
      "profile",
      "message",
      "case"
    ],
    "artifacts": [
      {
        "id": "phase-v51-parser-bridge",
        "definition": "never-define",
        "profile": {
          "className": "classes.modern_test.Phase_phase_v51_parser_bridge",
          "major": 51,
          "minor": 0,
          "flags": 33,
          "superclass": "java.lang.Object",
          "interfaces": [],
          "fields": [
            {
              "name": "wrongConstant",
              "descriptor": "Ljava/lang/String;",
              "flags": 25,
              "attributes": [
                {
                  "name": "ConstantValue",
                  "contents": {
                    "tag": 3,
                    "value": 7
                  }
                }
              ]
            }
          ],
          "methods": [
            {
              "name": "value",
              "descriptor": "()I",
              "flags": 73,
              "metadata": [],
              "code": {
                "maxStack": 0,
                "maxLocals": 0,
                "codeLength": 1,
                "operations": [
                  {
                    "pc": 0,
                    "opcode": "ireturn",
                    "length": 1
                  }
                ],
                "handlers": [],
                "attributes": []
              }
            }
          ],
          "attributes": []
        }
      }
    ]
  },
  {
    "id": "phase-v69-valid",
    "event": "empty;byte/model=equal;list=immutable;definition=never",
    "profileLine": "PROFILE|phase-v69-valid|major=69|bytes=0|model=0|categories=empty",
    "categories": [],
    "messageCount": 0,
    "messageCategories": [],
    "initializationDebug": false,
    "parserArgumentCallback": false,
    "sourceGroup": "versions",
    "sourceGroupDescriptor": "()V",
    "outputOrder": [
      "artifact",
      "profile",
      "case"
    ],
    "artifacts": [
      {
        "id": "phase-v69-valid",
        "definition": "never-define",
        "profile": {
          "className": "classes.modern_test.Phase_phase_v69_valid",
          "major": 69,
          "minor": 0,
          "flags": 33,
          "superclass": "java.lang.Object",
          "interfaces": [],
          "fields": [],
          "methods": [
            {
              "name": "value",
              "descriptor": "()I",
              "flags": 9,
              "metadata": [],
              "code": {
                "maxStack": 1,
                "maxLocals": 0,
                "codeLength": 3,
                "operations": [
                  {
                    "pc": 0,
                    "opcode": "bipush",
                    "length": 2,
                    "value": 7
                  },
                  {
                    "pc": 2,
                    "opcode": "ireturn",
                    "length": 1
                  }
                ],
                "handlers": [],
                "attributes": []
              }
            }
          ],
          "attributes": []
        }
      }
    ]
  },
  {
    "id": "phase-v69-ordinary-bad",
    "event": "byte-underflow;byte/model=equal;list=immutable;definition=never",
    "profileLine": "PROFILE|phase-v69-ordinary-bad|major=69|bytes=1|model=1|categories=byte-underflow",
    "categories": [
      "byte-underflow"
    ],
    "messageCount": 1,
    "messageCategories": [
      "byte-underflow"
    ],
    "initializationDebug": false,
    "parserArgumentCallback": false,
    "sourceGroup": "versions",
    "sourceGroupDescriptor": "()V",
    "outputOrder": [
      "artifact",
      "profile",
      "message",
      "case"
    ],
    "artifacts": [
      {
        "id": "phase-v69-ordinary-bad",
        "definition": "never-define",
        "profile": {
          "className": "classes.modern_test.Phase_phase_v69_ordinary_bad",
          "major": 69,
          "minor": 0,
          "flags": 33,
          "superclass": "java.lang.Object",
          "interfaces": [],
          "fields": [],
          "methods": [
            {
              "name": "value",
              "descriptor": "()I",
              "flags": 9,
              "metadata": [],
              "code": {
                "maxStack": 0,
                "maxLocals": 0,
                "codeLength": 1,
                "operations": [
                  {
                    "pc": 0,
                    "opcode": "ireturn",
                    "length": 1
                  }
                ],
                "handlers": [],
                "attributes": []
              }
            }
          ],
          "attributes": []
        }
      }
    ]
  },
  {
    "id": "phase-v69-bridge-bad",
    "event": "empty;byte/model=equal;list=immutable;definition=never",
    "profileLine": "PROFILE|phase-v69-bridge-bad|major=69|bytes=0|model=0|categories=empty",
    "categories": [],
    "messageCount": 0,
    "messageCategories": [],
    "initializationDebug": false,
    "parserArgumentCallback": false,
    "sourceGroup": "versions",
    "sourceGroupDescriptor": "()V",
    "outputOrder": [
      "artifact",
      "profile",
      "case"
    ],
    "artifacts": [
      {
        "id": "phase-v69-bridge-bad",
        "definition": "never-define",
        "profile": {
          "className": "classes.modern_test.Phase_phase_v69_bridge_bad",
          "major": 69,
          "minor": 0,
          "flags": 33,
          "superclass": "java.lang.Object",
          "interfaces": [],
          "fields": [],
          "methods": [
            {
              "name": "value",
              "descriptor": "()I",
              "flags": 73,
              "metadata": [],
              "code": {
                "maxStack": 0,
                "maxLocals": 0,
                "codeLength": 1,
                "operations": [
                  {
                    "pc": 0,
                    "opcode": "ireturn",
                    "length": 1
                  }
                ],
                "handlers": [],
                "attributes": []
              }
            }
          ],
          "attributes": []
        }
      }
    ]
  },
  {
    "id": "phase-v69-parser-bridge",
    "event": "parser-constant;byte/model=equal;list=immutable;definition=never",
    "profileLine": "PROFILE|phase-v69-parser-bridge|major=69|bytes=1|model=1|categories=parser-constant",
    "categories": [
      "parser-constant"
    ],
    "messageCount": 1,
    "messageCategories": [
      "parser-constant"
    ],
    "initializationDebug": false,
    "parserArgumentCallback": false,
    "sourceGroup": "versions",
    "sourceGroupDescriptor": "()V",
    "outputOrder": [
      "artifact",
      "profile",
      "message",
      "case"
    ],
    "artifacts": [
      {
        "id": "phase-v69-parser-bridge",
        "definition": "never-define",
        "profile": {
          "className": "classes.modern_test.Phase_phase_v69_parser_bridge",
          "major": 69,
          "minor": 0,
          "flags": 33,
          "superclass": "java.lang.Object",
          "interfaces": [],
          "fields": [
            {
              "name": "wrongConstant",
              "descriptor": "Ljava/lang/String;",
              "flags": 25,
              "attributes": [
                {
                  "name": "ConstantValue",
                  "contents": {
                    "tag": 3,
                    "value": 7
                  }
                }
              ]
            }
          ],
          "methods": [
            {
              "name": "value",
              "descriptor": "()I",
              "flags": 73,
              "metadata": [],
              "code": {
                "maxStack": 0,
                "maxLocals": 0,
                "codeLength": 1,
                "operations": [
                  {
                    "pc": 0,
                    "opcode": "ireturn",
                    "length": 1
                  }
                ],
                "handlers": [],
                "attributes": []
              }
            }
          ],
          "attributes": []
        }
      }
    ]
  },
  {
    "id": "phase-bridge-no-code",
    "event": "empty;byte/model=equal;list=immutable;definition=never",
    "profileLine": "PROFILE|phase-bridge-no-code|major=69|bytes=0|model=0|categories=empty",
    "categories": [],
    "messageCount": 0,
    "messageCategories": [],
    "initializationDebug": false,
    "parserArgumentCallback": false,
    "sourceGroup": "bridgesAndFlags",
    "sourceGroupDescriptor": "()V",
    "outputOrder": [
      "artifact",
      "profile",
      "case"
    ],
    "artifacts": [
      {
        "id": "phase-bridge-no-code",
        "definition": "never-define",
        "profile": {
          "className": "classes.modern_test.Phase_phase_bridge_no_code",
          "major": 69,
          "minor": 0,
          "flags": 33,
          "superclass": "java.lang.Object",
          "interfaces": [],
          "fields": [],
          "methods": [
            {
              "name": "value",
              "descriptor": "()I",
              "flags": 73,
              "metadata": [],
              "code": null
            }
          ],
          "attributes": []
        }
      }
    ]
  },
  {
    "id": "phase-synthetic-bad",
    "event": "byte-underflow;byte/model=equal;list=immutable;definition=never",
    "profileLine": "PROFILE|phase-synthetic-bad|major=69|bytes=1|model=1|categories=byte-underflow",
    "categories": [
      "byte-underflow"
    ],
    "messageCount": 1,
    "messageCategories": [
      "byte-underflow"
    ],
    "initializationDebug": false,
    "parserArgumentCallback": false,
    "sourceGroup": "bridgesAndFlags",
    "sourceGroupDescriptor": "()V",
    "outputOrder": [
      "artifact",
      "profile",
      "message",
      "case"
    ],
    "artifacts": [
      {
        "id": "phase-synthetic-bad",
        "definition": "never-define",
        "profile": {
          "className": "classes.modern_test.Phase_phase_synthetic_bad",
          "major": 69,
          "minor": 0,
          "flags": 33,
          "superclass": "java.lang.Object",
          "interfaces": [],
          "fields": [],
          "methods": [
            {
              "name": "value",
              "descriptor": "()I",
              "flags": 4105,
              "metadata": [],
              "code": {
                "maxStack": 0,
                "maxLocals": 0,
                "codeLength": 1,
                "operations": [
                  {
                    "pc": 0,
                    "opcode": "ireturn",
                    "length": 1
                  }
                ],
                "handlers": [],
                "attributes": []
              }
            }
          ],
          "attributes": []
        }
      }
    ]
  },
  {
    "id": "phase-bridge-lvt-operand",
    "event": "empty;byte/model=equal;list=immutable;definition=never",
    "profileLine": "PROFILE|phase-bridge-lvt-operand|major=69|bytes=0|model=0|categories=empty",
    "categories": [],
    "messageCount": 0,
    "messageCategories": [],
    "initializationDebug": false,
    "parserArgumentCallback": false,
    "sourceGroup": "bridgesAndFlags",
    "sourceGroupDescriptor": "()V",
    "outputOrder": [
      "artifact",
      "profile",
      "case"
    ],
    "artifacts": [
      {
        "id": "phase-bridge-lvt-operand",
        "definition": "never-define",
        "profile": {
          "className": "classes.modern_test.Phase_phase_bridge_lvt_operand",
          "major": 69,
          "minor": 0,
          "flags": 33,
          "superclass": "java.lang.Object",
          "interfaces": [],
          "fields": [],
          "methods": [
            {
              "name": "value",
              "descriptor": "(I)I",
              "flags": 73,
              "metadata": [],
              "code": {
                "maxStack": 1,
                "maxLocals": 1,
                "codeLength": 3,
                "operations": [
                  {
                    "pc": 0,
                    "opcode": "bipush",
                    "length": 2,
                    "value": 7
                  },
                  {
                    "pc": 2,
                    "opcode": "ireturn",
                    "length": 1
                  }
                ],
                "handlers": [],
                "attributes": [
                  {
                    "name": "LocalVariableTable",
                    "contents": [
                      {
                        "start": 1,
                        "length": 2,
                        "name": "x",
                        "type": "I",
                        "slot": 0
                      }
                    ]
                  }
                ]
              }
            }
          ],
          "attributes": []
        }
      }
    ]
  },
  {
    "id": "phase-ordinary-lvt-operand",
    "event": "byte-lvt;byte/model=equal;list=immutable;definition=never",
    "profileLine": "PROFILE|phase-ordinary-lvt-operand|major=69|bytes=1|model=1|categories=byte-lvt",
    "categories": [
      "byte-lvt"
    ],
    "messageCount": 1,
    "messageCategories": [
      "byte-lvt"
    ],
    "initializationDebug": false,
    "parserArgumentCallback": false,
    "sourceGroup": "bridgesAndFlags",
    "sourceGroupDescriptor": "()V",
    "outputOrder": [
      "artifact",
      "profile",
      "message",
      "case"
    ],
    "artifacts": [
      {
        "id": "phase-ordinary-lvt-operand",
        "definition": "never-define",
        "profile": {
          "className": "classes.modern_test.Phase_phase_ordinary_lvt_operand",
          "major": 69,
          "minor": 0,
          "flags": 33,
          "superclass": "java.lang.Object",
          "interfaces": [],
          "fields": [],
          "methods": [
            {
              "name": "value",
              "descriptor": "(I)I",
              "flags": 9,
              "metadata": [],
              "code": {
                "maxStack": 1,
                "maxLocals": 1,
                "codeLength": 3,
                "operations": [
                  {
                    "pc": 0,
                    "opcode": "bipush",
                    "length": 2,
                    "value": 7
                  },
                  {
                    "pc": 2,
                    "opcode": "ireturn",
                    "length": 1
                  }
                ],
                "handlers": [],
                "attributes": [
                  {
                    "name": "LocalVariableTable",
                    "contents": [
                      {
                        "start": 1,
                        "length": 2,
                        "name": "x",
                        "type": "I",
                        "slot": 0
                      }
                    ]
                  }
                ]
              }
            }
          ],
          "attributes": []
        }
      }
    ]
  },
  {
    "id": "phase-bridge-debug-initialization",
    "event": "initialization-debug;byte/model=equal;list=immutable;definition=never",
    "profileLine": "PROFILE|phase-bridge-debug-initialization|major=69|bytes=1|model=1|categories=initialization-debug",
    "categories": [
      "initialization-debug"
    ],
    "messageCount": 1,
    "messageCategories": [
      "initialization-debug"
    ],
    "initializationDebug": true,
    "parserArgumentCallback": false,
    "sourceGroup": "bridgesAndFlags",
    "sourceGroupDescriptor": "()V",
    "outputOrder": [
      "artifact",
      "profile",
      "message",
      "case"
    ],
    "artifacts": [
      {
        "id": "phase-bridge-debug-initialization",
        "definition": "never-define",
        "profile": {
          "className": "classes.modern_test.Phase_phase_bridge_debug_initialization",
          "major": 69,
          "minor": 0,
          "flags": 33,
          "superclass": "java.lang.Object",
          "interfaces": [],
          "fields": [],
          "methods": [
            {
              "name": "value",
              "descriptor": "(I)I",
              "flags": 73,
              "metadata": [],
              "code": {
                "maxStack": 1,
                "maxLocals": 1,
                "codeLength": 3,
                "operations": [
                  {
                    "pc": 0,
                    "opcode": "bipush",
                    "length": 2,
                    "value": 7
                  },
                  {
                    "pc": 2,
                    "opcode": "ireturn",
                    "length": 1
                  }
                ],
                "handlers": [],
                "attributes": [
                  {
                    "name": "LocalVariableTable",
                    "contents": [
                      {
                        "start": 4,
                        "length": 2,
                        "name": "x",
                        "type": "I",
                        "slot": 0
                      }
                    ]
                  }
                ]
              }
            }
          ],
          "attributes": []
        }
      }
    ]
  },
  {
    "id": "phase-bridge-locals-short",
    "event": "parser-arguments;byte/model=equal;list=immutable;definition=never",
    "profileLine": "PROFILE|phase-bridge-locals-short|major=69|bytes=1|model=1|categories=parser-arguments",
    "categories": [
      "parser-arguments"
    ],
    "messageCount": 1,
    "messageCategories": [
      "parser-arguments"
    ],
    "initializationDebug": false,
    "parserArgumentCallback": false,
    "sourceGroup": "bridgesAndFlags",
    "sourceGroupDescriptor": "()V",
    "outputOrder": [
      "artifact",
      "profile",
      "message",
      "case"
    ],
    "artifacts": [
      {
        "id": "phase-bridge-locals-short",
        "definition": "never-define",
        "profile": {
          "className": "classes.modern_test.Phase_phase_bridge_locals_short",
          "major": 69,
          "minor": 0,
          "flags": 33,
          "superclass": "java.lang.Object",
          "interfaces": [],
          "fields": [],
          "methods": [
            {
              "name": "value",
              "descriptor": "(I)I",
              "flags": 73,
              "metadata": [],
              "code": {
                "maxStack": 1,
                "maxLocals": 0,
                "codeLength": 3,
                "operations": [
                  {
                    "pc": 0,
                    "opcode": "bipush",
                    "length": 2,
                    "value": 7
                  },
                  {
                    "pc": 2,
                    "opcode": "ireturn",
                    "length": 1
                  }
                ],
                "handlers": [],
                "attributes": [
                  {
                    "name": "LocalVariableTable",
                    "contents": [
                      {
                        "start": 0,
                        "length": 2,
                        "name": "x",
                        "type": "I",
                        "slot": 0
                      }
                    ]
                  }
                ]
              }
            }
          ],
          "attributes": []
        }
      }
    ]
  },
  {
    "id": "phase-native-with-code",
    "event": "parser-code;byte/model=equal;list=immutable;definition=never",
    "profileLine": "PROFILE|phase-native-with-code|major=69|bytes=1|model=1|categories=parser-code",
    "categories": [
      "parser-code"
    ],
    "messageCount": 1,
    "messageCategories": [
      "parser-code"
    ],
    "initializationDebug": false,
    "parserArgumentCallback": false,
    "sourceGroup": "bridgesAndFlags",
    "sourceGroupDescriptor": "()V",
    "outputOrder": [
      "artifact",
      "profile",
      "message",
      "case"
    ],
    "artifacts": [
      {
        "id": "phase-native-with-code",
        "definition": "never-define",
        "profile": {
          "className": "classes.modern_test.Phase_phase_native_with_code",
          "major": 69,
          "minor": 0,
          "flags": 33,
          "superclass": "java.lang.Object",
          "interfaces": [],
          "fields": [],
          "methods": [
            {
              "name": "value",
              "descriptor": "()I",
              "flags": 265,
              "metadata": [],
              "code": {
                "maxStack": 1,
                "maxLocals": 0,
                "codeLength": 3,
                "operations": [
                  {
                    "pc": 0,
                    "opcode": "bipush",
                    "length": 2,
                    "value": 7
                  },
                  {
                    "pc": 2,
                    "opcode": "ireturn",
                    "length": 1
                  }
                ],
                "handlers": [],
                "attributes": []
              }
            }
          ],
          "attributes": []
        }
      }
    ]
  },
  {
    "id": "phase-abstract-with-code",
    "event": "parser-code;byte/model=equal;list=immutable;definition=never",
    "profileLine": "PROFILE|phase-abstract-with-code|major=69|bytes=1|model=1|categories=parser-code",
    "categories": [
      "parser-code"
    ],
    "messageCount": 1,
    "messageCategories": [
      "parser-code"
    ],
    "initializationDebug": false,
    "parserArgumentCallback": false,
    "sourceGroup": "bridgesAndFlags",
    "sourceGroupDescriptor": "()V",
    "outputOrder": [
      "artifact",
      "profile",
      "message",
      "case"
    ],
    "artifacts": [
      {
        "id": "phase-abstract-with-code",
        "definition": "never-define",
        "profile": {
          "className": "classes.modern_test.Phase_phase_abstract_with_code",
          "major": 69,
          "minor": 0,
          "flags": 33,
          "superclass": "java.lang.Object",
          "interfaces": [],
          "fields": [],
          "methods": [
            {
              "name": "value",
              "descriptor": "()I",
              "flags": 1025,
              "metadata": [],
              "code": {
                "maxStack": 1,
                "maxLocals": 1,
                "codeLength": 3,
                "operations": [
                  {
                    "pc": 0,
                    "opcode": "bipush",
                    "length": 2,
                    "value": 7
                  },
                  {
                    "pc": 2,
                    "opcode": "ireturn",
                    "length": 1
                  }
                ],
                "handlers": [],
                "attributes": []
              }
            }
          ],
          "attributes": []
        }
      }
    ]
  },
  {
    "id": "phase-native-no-code",
    "event": "empty;byte/model=equal;list=immutable;definition=never",
    "profileLine": "PROFILE|phase-native-no-code|major=69|bytes=0|model=0|categories=empty",
    "categories": [],
    "messageCount": 0,
    "messageCategories": [],
    "initializationDebug": false,
    "parserArgumentCallback": false,
    "sourceGroup": "bridgesAndFlags",
    "sourceGroupDescriptor": "()V",
    "outputOrder": [
      "artifact",
      "profile",
      "case"
    ],
    "artifacts": [
      {
        "id": "phase-native-no-code",
        "definition": "never-define",
        "profile": {
          "className": "classes.modern_test.Phase_phase_native_no_code",
          "major": 69,
          "minor": 0,
          "flags": 33,
          "superclass": "java.lang.Object",
          "interfaces": [],
          "fields": [],
          "methods": [
            {
              "name": "value",
              "descriptor": "()I",
              "flags": 265,
              "metadata": [],
              "code": null
            }
          ],
          "attributes": []
        }
      }
    ]
  },
  {
    "id": "phase-abstract-no-code",
    "event": "empty;byte/model=equal;list=immutable;definition=never",
    "profileLine": "PROFILE|phase-abstract-no-code|major=69|bytes=0|model=0|categories=empty",
    "categories": [],
    "messageCount": 0,
    "messageCategories": [],
    "initializationDebug": false,
    "parserArgumentCallback": false,
    "sourceGroup": "bridgesAndFlags",
    "sourceGroupDescriptor": "()V",
    "outputOrder": [
      "artifact",
      "profile",
      "case"
    ],
    "artifacts": [
      {
        "id": "phase-abstract-no-code",
        "definition": "never-define",
        "profile": {
          "className": "classes.modern_test.Phase_phase_abstract_no_code",
          "major": 69,
          "minor": 0,
          "flags": 33,
          "superclass": "java.lang.Object",
          "interfaces": [],
          "fields": [],
          "methods": [
            {
              "name": "value",
              "descriptor": "()I",
              "flags": 1025,
              "metadata": [],
              "code": null
            }
          ],
          "attributes": []
        }
      }
    ]
  },
  {
    "id": "phase-multi50",
    "event": "inference;byte/model=equal;list=immutable;definition=never",
    "profileLine": "PROFILE|phase-multi50|major=50|bytes=1|model=1|categories=inference",
    "categories": [
      "inference"
    ],
    "messageCount": 1,
    "messageCategories": [
      "inference"
    ],
    "initializationDebug": false,
    "parserArgumentCallback": false,
    "sourceGroup": "multipleErrors",
    "sourceGroupDescriptor": "()V",
    "outputOrder": [
      "artifact",
      "profile",
      "message",
      "case"
    ],
    "artifacts": [
      {
        "id": "phase-multi50",
        "definition": "never-define",
        "profile": {
          "className": "classes.modern_test.Phase_phase_multi50",
          "major": 50,
          "minor": 0,
          "flags": 33,
          "superclass": "java.lang.Object",
          "interfaces": [],
          "fields": [],
          "methods": [
            {
              "name": "first",
              "descriptor": "()I",
              "flags": 9,
              "metadata": [],
              "code": {
                "maxStack": 0,
                "maxLocals": 0,
                "codeLength": 1,
                "operations": [
                  {
                    "pc": 0,
                    "opcode": "ireturn",
                    "length": 1
                  }
                ],
                "handlers": [],
                "attributes": []
              }
            },
            {
              "name": "second",
              "descriptor": "()I",
              "flags": 9,
              "metadata": [],
              "code": {
                "maxStack": 0,
                "maxLocals": 0,
                "codeLength": 1,
                "operations": [
                  {
                    "pc": 0,
                    "opcode": "return",
                    "length": 1
                  }
                ],
                "handlers": [],
                "attributes": []
              }
            }
          ],
          "attributes": []
        }
      }
    ]
  },
  {
    "id": "phase-multi50-bridge",
    "event": "inference;byte/model=equal;list=immutable;definition=never",
    "profileLine": "PROFILE|phase-multi50-bridge|major=50|bytes=1|model=1|categories=inference",
    "categories": [
      "inference"
    ],
    "messageCount": 1,
    "messageCategories": [
      "inference"
    ],
    "initializationDebug": false,
    "parserArgumentCallback": false,
    "sourceGroup": "multipleErrors",
    "sourceGroupDescriptor": "()V",
    "outputOrder": [
      "artifact",
      "profile",
      "message",
      "case"
    ],
    "artifacts": [
      {
        "id": "phase-multi50-bridge",
        "definition": "never-define",
        "profile": {
          "className": "classes.modern_test.Phase_phase_multi50_bridge",
          "major": 50,
          "minor": 0,
          "flags": 33,
          "superclass": "java.lang.Object",
          "interfaces": [],
          "fields": [],
          "methods": [
            {
              "name": "first",
              "descriptor": "()I",
              "flags": 9,
              "metadata": [],
              "code": {
                "maxStack": 0,
                "maxLocals": 0,
                "codeLength": 1,
                "operations": [
                  {
                    "pc": 0,
                    "opcode": "ireturn",
                    "length": 1
                  }
                ],
                "handlers": [],
                "attributes": []
              }
            },
            {
              "name": "bridgeBetween",
              "descriptor": "()I",
              "flags": 73,
              "metadata": [],
              "code": {
                "maxStack": 0,
                "maxLocals": 0,
                "codeLength": 1,
                "operations": [
                  {
                    "pc": 0,
                    "opcode": "ireturn",
                    "length": 1
                  }
                ],
                "handlers": [],
                "attributes": []
              }
            },
            {
              "name": "second",
              "descriptor": "()I",
              "flags": 9,
              "metadata": [],
              "code": {
                "maxStack": 0,
                "maxLocals": 0,
                "codeLength": 1,
                "operations": [
                  {
                    "pc": 0,
                    "opcode": "return",
                    "length": 1
                  }
                ],
                "handlers": [],
                "attributes": []
              }
            }
          ],
          "attributes": []
        }
      }
    ]
  },
  {
    "id": "phase-multi50-parser",
    "event": "parser-constant,inference;byte/model=equal;list=immutable;definition=never",
    "profileLine": "PROFILE|phase-multi50-parser|major=50|bytes=2|model=2|categories=parser-constant,inference",
    "categories": [
      "parser-constant",
      "inference"
    ],
    "messageCount": 2,
    "messageCategories": [
      "parser-constant",
      "inference"
    ],
    "initializationDebug": false,
    "parserArgumentCallback": false,
    "sourceGroup": "multipleErrors",
    "sourceGroupDescriptor": "()V",
    "outputOrder": [
      "artifact",
      "profile",
      "message",
      "message",
      "case"
    ],
    "artifacts": [
      {
        "id": "phase-multi50-parser",
        "definition": "never-define",
        "profile": {
          "className": "classes.modern_test.Phase_phase_multi50_parser",
          "major": 50,
          "minor": 0,
          "flags": 33,
          "superclass": "java.lang.Object",
          "interfaces": [],
          "fields": [
            {
              "name": "wrongConstant",
              "descriptor": "Ljava/lang/String;",
              "flags": 25,
              "attributes": [
                {
                  "name": "ConstantValue",
                  "contents": {
                    "tag": 3,
                    "value": 7
                  }
                }
              ]
            }
          ],
          "methods": [
            {
              "name": "first",
              "descriptor": "()I",
              "flags": 9,
              "metadata": [],
              "code": {
                "maxStack": 0,
                "maxLocals": 0,
                "codeLength": 1,
                "operations": [
                  {
                    "pc": 0,
                    "opcode": "ireturn",
                    "length": 1
                  }
                ],
                "handlers": [],
                "attributes": []
              }
            },
            {
              "name": "bridgeBetween",
              "descriptor": "()I",
              "flags": 73,
              "metadata": [],
              "code": {
                "maxStack": 0,
                "maxLocals": 0,
                "codeLength": 1,
                "operations": [
                  {
                    "pc": 0,
                    "opcode": "ireturn",
                    "length": 1
                  }
                ],
                "handlers": [],
                "attributes": []
              }
            },
            {
              "name": "second",
              "descriptor": "()I",
              "flags": 9,
              "metadata": [],
              "code": {
                "maxStack": 0,
                "maxLocals": 0,
                "codeLength": 1,
                "operations": [
                  {
                    "pc": 0,
                    "opcode": "return",
                    "length": 1
                  }
                ],
                "handlers": [],
                "attributes": []
              }
            }
          ],
          "attributes": []
        }
      }
    ]
  },
  {
    "id": "phase-multi69",
    "event": "byte-underflow,byte-return;byte/model=equal;list=immutable;definition=never",
    "profileLine": "PROFILE|phase-multi69|major=69|bytes=2|model=2|categories=byte-underflow,byte-return",
    "categories": [
      "byte-underflow",
      "byte-return"
    ],
    "messageCount": 2,
    "messageCategories": [
      "byte-underflow",
      "byte-return"
    ],
    "initializationDebug": false,
    "parserArgumentCallback": false,
    "sourceGroup": "multipleErrors",
    "sourceGroupDescriptor": "()V",
    "outputOrder": [
      "artifact",
      "profile",
      "message",
      "message",
      "case"
    ],
    "artifacts": [
      {
        "id": "phase-multi69",
        "definition": "never-define",
        "profile": {
          "className": "classes.modern_test.Phase_phase_multi69",
          "major": 69,
          "minor": 0,
          "flags": 33,
          "superclass": "java.lang.Object",
          "interfaces": [],
          "fields": [],
          "methods": [
            {
              "name": "first",
              "descriptor": "()I",
              "flags": 9,
              "metadata": [],
              "code": {
                "maxStack": 0,
                "maxLocals": 0,
                "codeLength": 1,
                "operations": [
                  {
                    "pc": 0,
                    "opcode": "ireturn",
                    "length": 1
                  }
                ],
                "handlers": [],
                "attributes": []
              }
            },
            {
              "name": "second",
              "descriptor": "()I",
              "flags": 9,
              "metadata": [],
              "code": {
                "maxStack": 0,
                "maxLocals": 0,
                "codeLength": 1,
                "operations": [
                  {
                    "pc": 0,
                    "opcode": "return",
                    "length": 1
                  }
                ],
                "handlers": [],
                "attributes": []
              }
            }
          ],
          "attributes": []
        }
      }
    ]
  },
  {
    "id": "phase-multi69-bridge",
    "event": "byte-underflow,byte-return;byte/model=equal;list=immutable;definition=never",
    "profileLine": "PROFILE|phase-multi69-bridge|major=69|bytes=2|model=2|categories=byte-underflow,byte-return",
    "categories": [
      "byte-underflow",
      "byte-return"
    ],
    "messageCount": 2,
    "messageCategories": [
      "byte-underflow",
      "byte-return"
    ],
    "initializationDebug": false,
    "parserArgumentCallback": false,
    "sourceGroup": "multipleErrors",
    "sourceGroupDescriptor": "()V",
    "outputOrder": [
      "artifact",
      "profile",
      "message",
      "message",
      "case"
    ],
    "artifacts": [
      {
        "id": "phase-multi69-bridge",
        "definition": "never-define",
        "profile": {
          "className": "classes.modern_test.Phase_phase_multi69_bridge",
          "major": 69,
          "minor": 0,
          "flags": 33,
          "superclass": "java.lang.Object",
          "interfaces": [],
          "fields": [],
          "methods": [
            {
              "name": "first",
              "descriptor": "()I",
              "flags": 9,
              "metadata": [],
              "code": {
                "maxStack": 0,
                "maxLocals": 0,
                "codeLength": 1,
                "operations": [
                  {
                    "pc": 0,
                    "opcode": "ireturn",
                    "length": 1
                  }
                ],
                "handlers": [],
                "attributes": []
              }
            },
            {
              "name": "bridgeBetween",
              "descriptor": "()I",
              "flags": 73,
              "metadata": [],
              "code": {
                "maxStack": 0,
                "maxLocals": 0,
                "codeLength": 1,
                "operations": [
                  {
                    "pc": 0,
                    "opcode": "ireturn",
                    "length": 1
                  }
                ],
                "handlers": [],
                "attributes": []
              }
            },
            {
              "name": "second",
              "descriptor": "()I",
              "flags": 9,
              "metadata": [],
              "code": {
                "maxStack": 0,
                "maxLocals": 0,
                "codeLength": 1,
                "operations": [
                  {
                    "pc": 0,
                    "opcode": "return",
                    "length": 1
                  }
                ],
                "handlers": [],
                "attributes": []
              }
            }
          ],
          "attributes": []
        }
      }
    ]
  },
  {
    "id": "phase-multi69-parser",
    "event": "parser-constant,byte-underflow,byte-return;byte/model=equal;list=immutable;definition=never",
    "profileLine": "PROFILE|phase-multi69-parser|major=69|bytes=3|model=3|categories=parser-constant,byte-underflow,byte-return",
    "categories": [
      "parser-constant",
      "byte-underflow",
      "byte-return"
    ],
    "messageCount": 3,
    "messageCategories": [
      "parser-constant",
      "byte-underflow",
      "byte-return"
    ],
    "initializationDebug": false,
    "parserArgumentCallback": false,
    "sourceGroup": "multipleErrors",
    "sourceGroupDescriptor": "()V",
    "outputOrder": [
      "artifact",
      "profile",
      "message",
      "message",
      "message",
      "case"
    ],
    "artifacts": [
      {
        "id": "phase-multi69-parser",
        "definition": "never-define",
        "profile": {
          "className": "classes.modern_test.Phase_phase_multi69_parser",
          "major": 69,
          "minor": 0,
          "flags": 33,
          "superclass": "java.lang.Object",
          "interfaces": [],
          "fields": [
            {
              "name": "wrongConstant",
              "descriptor": "Ljava/lang/String;",
              "flags": 25,
              "attributes": [
                {
                  "name": "ConstantValue",
                  "contents": {
                    "tag": 3,
                    "value": 7
                  }
                }
              ]
            }
          ],
          "methods": [
            {
              "name": "first",
              "descriptor": "()I",
              "flags": 9,
              "metadata": [],
              "code": {
                "maxStack": 0,
                "maxLocals": 0,
                "codeLength": 1,
                "operations": [
                  {
                    "pc": 0,
                    "opcode": "ireturn",
                    "length": 1
                  }
                ],
                "handlers": [],
                "attributes": []
              }
            },
            {
              "name": "bridgeBetween",
              "descriptor": "()I",
              "flags": 73,
              "metadata": [],
              "code": {
                "maxStack": 0,
                "maxLocals": 0,
                "codeLength": 1,
                "operations": [
                  {
                    "pc": 0,
                    "opcode": "ireturn",
                    "length": 1
                  }
                ],
                "handlers": [],
                "attributes": []
              }
            },
            {
              "name": "second",
              "descriptor": "()I",
              "flags": 9,
              "metadata": [],
              "code": {
                "maxStack": 0,
                "maxLocals": 0,
                "codeLength": 1,
                "operations": [
                  {
                    "pc": 0,
                    "opcode": "return",
                    "length": 1
                  }
                ],
                "handlers": [],
                "attributes": []
              }
            }
          ],
          "attributes": []
        }
      }
    ]
  },
  {
    "id": "phase-parser-valid50",
    "event": "parser-constant;byte/model=equal;list=immutable;definition=never",
    "profileLine": "PROFILE|phase-parser-valid50|major=50|bytes=1|model=1|categories=parser-constant",
    "categories": [
      "parser-constant"
    ],
    "messageCount": 1,
    "messageCategories": [
      "parser-constant"
    ],
    "initializationDebug": false,
    "parserArgumentCallback": false,
    "sourceGroup": "multipleErrors",
    "sourceGroupDescriptor": "()V",
    "outputOrder": [
      "artifact",
      "profile",
      "message",
      "case"
    ],
    "artifacts": [
      {
        "id": "phase-parser-valid50",
        "definition": "never-define",
        "profile": {
          "className": "classes.modern_test.Phase_phase_parser_valid50",
          "major": 50,
          "minor": 0,
          "flags": 33,
          "superclass": "java.lang.Object",
          "interfaces": [],
          "fields": [
            {
              "name": "wrongConstant",
              "descriptor": "Ljava/lang/String;",
              "flags": 25,
              "attributes": [
                {
                  "name": "ConstantValue",
                  "contents": {
                    "tag": 3,
                    "value": 7
                  }
                }
              ]
            }
          ],
          "methods": [
            {
              "name": "value",
              "descriptor": "()I",
              "flags": 9,
              "metadata": [],
              "code": {
                "maxStack": 1,
                "maxLocals": 0,
                "codeLength": 3,
                "operations": [
                  {
                    "pc": 0,
                    "opcode": "bipush",
                    "length": 2,
                    "value": 7
                  },
                  {
                    "pc": 2,
                    "opcode": "ireturn",
                    "length": 1
                  }
                ],
                "handlers": [],
                "attributes": []
              }
            }
          ],
          "attributes": []
        }
      }
    ]
  },
  {
    "id": "phase-bridge-jsr50",
    "event": "empty;byte/model=equal;list=immutable;definition=never",
    "profileLine": "PROFILE|phase-bridge-jsr50|major=50|bytes=0|model=0|categories=empty",
    "categories": [],
    "messageCount": 0,
    "messageCategories": [],
    "initializationDebug": false,
    "parserArgumentCallback": false,
    "sourceGroup": "discontinued",
    "sourceGroupDescriptor": "()V",
    "outputOrder": [
      "artifact",
      "profile",
      "case"
    ],
    "artifacts": [
      {
        "id": "phase-bridge-jsr50",
        "definition": "never-define",
        "profile": {
          "className": "classes.modern_test.Phase_phase_bridge_jsr50",
          "major": 50,
          "minor": 0,
          "flags": 33,
          "superclass": "java.lang.Object",
          "interfaces": [],
          "fields": [],
          "methods": [
            {
              "name": "value",
              "descriptor": "()I",
              "flags": 73,
              "metadata": [],
              "code": {
                "maxStack": 2,
                "maxLocals": 1,
                "codeLength": 8,
                "operations": [
                  {
                    "pc": 0,
                    "opcode": "jsr",
                    "length": 3,
                    "branchTarget": 5
                  },
                  {
                    "pc": 3,
                    "opcode": "iconst_1",
                    "length": 1
                  },
                  {
                    "pc": 4,
                    "opcode": "ireturn",
                    "length": 1
                  },
                  {
                    "pc": 5,
                    "opcode": "astore_0",
                    "length": 1
                  },
                  {
                    "pc": 6,
                    "opcode": "ret",
                    "length": 2,
                    "localIndex": 0
                  }
                ],
                "handlers": [],
                "attributes": []
              }
            }
          ],
          "attributes": []
        }
      }
    ]
  },
  {
    "id": "phase-mixed-jsr50",
    "event": "inference;byte/model=equal;list=immutable;definition=never",
    "profileLine": "PROFILE|phase-mixed-jsr50|major=50|bytes=1|model=1|categories=inference",
    "categories": [
      "inference"
    ],
    "messageCount": 1,
    "messageCategories": [
      "inference"
    ],
    "initializationDebug": false,
    "parserArgumentCallback": false,
    "sourceGroup": "discontinued",
    "sourceGroupDescriptor": "()V",
    "outputOrder": [
      "artifact",
      "profile",
      "message",
      "case"
    ],
    "artifacts": [
      {
        "id": "phase-mixed-jsr50",
        "definition": "never-define",
        "profile": {
          "className": "classes.modern_test.Phase_phase_mixed_jsr50",
          "major": 50,
          "minor": 0,
          "flags": 33,
          "superclass": "java.lang.Object",
          "interfaces": [],
          "fields": [],
          "methods": [
            {
              "name": "first",
              "descriptor": "()I",
              "flags": 9,
              "metadata": [],
              "code": {
                "maxStack": 2,
                "maxLocals": 1,
                "codeLength": 8,
                "operations": [
                  {
                    "pc": 0,
                    "opcode": "jsr",
                    "length": 3,
                    "branchTarget": 5
                  },
                  {
                    "pc": 3,
                    "opcode": "iconst_1",
                    "length": 1
                  },
                  {
                    "pc": 4,
                    "opcode": "ireturn",
                    "length": 1
                  },
                  {
                    "pc": 5,
                    "opcode": "astore_0",
                    "length": 1
                  },
                  {
                    "pc": 6,
                    "opcode": "ret",
                    "length": 2,
                    "localIndex": 0
                  }
                ],
                "handlers": [],
                "attributes": []
              }
            },
            {
              "name": "bridgeBetween",
              "descriptor": "()I",
              "flags": 73,
              "metadata": [],
              "code": {
                "maxStack": 0,
                "maxLocals": 0,
                "codeLength": 1,
                "operations": [
                  {
                    "pc": 0,
                    "opcode": "ireturn",
                    "length": 1
                  }
                ],
                "handlers": [],
                "attributes": []
              }
            },
            {
              "name": "second",
              "descriptor": "()I",
              "flags": 9,
              "metadata": [],
              "code": {
                "maxStack": 0,
                "maxLocals": 0,
                "codeLength": 1,
                "operations": [
                  {
                    "pc": 0,
                    "opcode": "return",
                    "length": 1
                  }
                ],
                "handlers": [],
                "attributes": []
              }
            }
          ],
          "attributes": []
        }
      }
    ]
  },
  {
    "id": "phase-bridge-jsr69",
    "event": "empty;byte/model=equal;list=immutable;definition=never",
    "profileLine": "PROFILE|phase-bridge-jsr69|major=69|bytes=0|model=0|categories=empty",
    "categories": [],
    "messageCount": 0,
    "messageCategories": [],
    "initializationDebug": false,
    "parserArgumentCallback": false,
    "sourceGroup": "discontinued",
    "sourceGroupDescriptor": "()V",
    "outputOrder": [
      "artifact",
      "profile",
      "case"
    ],
    "artifacts": [
      {
        "id": "phase-bridge-jsr69",
        "definition": "never-define",
        "profile": {
          "className": "classes.modern_test.Phase_phase_bridge_jsr69",
          "major": 69,
          "minor": 0,
          "flags": 33,
          "superclass": "java.lang.Object",
          "interfaces": [],
          "fields": [],
          "methods": [
            {
              "name": "value",
              "descriptor": "()I",
              "flags": 73,
              "metadata": [],
              "code": {
                "maxStack": 2,
                "maxLocals": 1,
                "codeLength": 8,
                "operations": [
                  {
                    "pc": 0,
                    "opcode": "jsr",
                    "length": 3,
                    "branchTarget": 5
                  },
                  {
                    "pc": 3,
                    "opcode": "iconst_1",
                    "length": 1
                  },
                  {
                    "pc": 4,
                    "opcode": "ireturn",
                    "length": 1
                  },
                  {
                    "pc": 5,
                    "opcode": "astore_0",
                    "length": 1
                  },
                  {
                    "pc": 6,
                    "opcode": "ret",
                    "length": 2,
                    "localIndex": 0
                  }
                ],
                "handlers": [],
                "attributes": []
              }
            }
          ],
          "attributes": []
        }
      }
    ]
  },
  {
    "id": "phase-mixed-jsr69",
    "event": "byte-discontinued,byte-return;byte/model=equal;list=immutable;definition=never",
    "profileLine": "PROFILE|phase-mixed-jsr69|major=69|bytes=2|model=2|categories=byte-discontinued,byte-return",
    "categories": [
      "byte-discontinued",
      "byte-return"
    ],
    "messageCount": 2,
    "messageCategories": [
      "byte-discontinued",
      "byte-return"
    ],
    "initializationDebug": false,
    "parserArgumentCallback": false,
    "sourceGroup": "discontinued",
    "sourceGroupDescriptor": "()V",
    "outputOrder": [
      "artifact",
      "profile",
      "message",
      "message",
      "case"
    ],
    "artifacts": [
      {
        "id": "phase-mixed-jsr69",
        "definition": "never-define",
        "profile": {
          "className": "classes.modern_test.Phase_phase_mixed_jsr69",
          "major": 69,
          "minor": 0,
          "flags": 33,
          "superclass": "java.lang.Object",
          "interfaces": [],
          "fields": [],
          "methods": [
            {
              "name": "first",
              "descriptor": "()I",
              "flags": 9,
              "metadata": [],
              "code": {
                "maxStack": 2,
                "maxLocals": 1,
                "codeLength": 8,
                "operations": [
                  {
                    "pc": 0,
                    "opcode": "jsr",
                    "length": 3,
                    "branchTarget": 5
                  },
                  {
                    "pc": 3,
                    "opcode": "iconst_1",
                    "length": 1
                  },
                  {
                    "pc": 4,
                    "opcode": "ireturn",
                    "length": 1
                  },
                  {
                    "pc": 5,
                    "opcode": "astore_0",
                    "length": 1
                  },
                  {
                    "pc": 6,
                    "opcode": "ret",
                    "length": 2,
                    "localIndex": 0
                  }
                ],
                "handlers": [],
                "attributes": []
              }
            },
            {
              "name": "bridgeBetween",
              "descriptor": "()I",
              "flags": 73,
              "metadata": [],
              "code": {
                "maxStack": 0,
                "maxLocals": 0,
                "codeLength": 1,
                "operations": [
                  {
                    "pc": 0,
                    "opcode": "ireturn",
                    "length": 1
                  }
                ],
                "handlers": [],
                "attributes": []
              }
            },
            {
              "name": "second",
              "descriptor": "()I",
              "flags": 9,
              "metadata": [],
              "code": {
                "maxStack": 0,
                "maxLocals": 0,
                "codeLength": 1,
                "operations": [
                  {
                    "pc": 0,
                    "opcode": "return",
                    "length": 1
                  }
                ],
                "handlers": [],
                "attributes": []
              }
            }
          ],
          "attributes": []
        }
      }
    ]
  },
  {
    "id": "phase-excluded-Object",
    "event": "empty;byte/model=equal;list=immutable;definition=never",
    "profileLine": "PROFILE|phase-excluded-Object|major=69|bytes=0|model=0|categories=empty",
    "categories": [],
    "messageCount": 0,
    "messageCategories": [],
    "initializationDebug": false,
    "parserArgumentCallback": false,
    "sourceGroup": "excludedOwners",
    "sourceGroupDescriptor": "()V",
    "outputOrder": [
      "artifact",
      "profile",
      "case"
    ],
    "artifacts": [
      {
        "id": "phase-excluded-Object",
        "definition": "never-define",
        "profile": {
          "className": "java.lang.Object",
          "major": 69,
          "minor": 0,
          "flags": 33,
          "superclass": null,
          "interfaces": [],
          "fields": [],
          "methods": [
            {
              "name": "value",
              "descriptor": "()I",
              "flags": 9,
              "metadata": [],
              "code": {
                "maxStack": 0,
                "maxLocals": 0,
                "codeLength": 1,
                "operations": [
                  {
                    "pc": 0,
                    "opcode": "ireturn",
                    "length": 1
                  }
                ],
                "handlers": [],
                "attributes": []
              }
            }
          ],
          "attributes": []
        }
      }
    ]
  },
  {
    "id": "phase-excluded-parser-Object",
    "event": "parser-constant;byte/model=equal;list=immutable;definition=never",
    "profileLine": "PROFILE|phase-excluded-parser-Object|major=69|bytes=1|model=1|categories=parser-constant",
    "categories": [
      "parser-constant"
    ],
    "messageCount": 1,
    "messageCategories": [
      "parser-constant"
    ],
    "initializationDebug": false,
    "parserArgumentCallback": false,
    "sourceGroup": "excludedOwners",
    "sourceGroupDescriptor": "()V",
    "outputOrder": [
      "artifact",
      "profile",
      "message",
      "case"
    ],
    "artifacts": [
      {
        "id": "phase-excluded-parser-Object",
        "definition": "never-define",
        "profile": {
          "className": "java.lang.Object",
          "major": 69,
          "minor": 0,
          "flags": 33,
          "superclass": null,
          "interfaces": [],
          "fields": [
            {
              "name": "wrongConstant",
              "descriptor": "Ljava/lang/String;",
              "flags": 25,
              "attributes": [
                {
                  "name": "ConstantValue",
                  "contents": {
                    "tag": 3,
                    "value": 7
                  }
                }
              ]
            }
          ],
          "methods": [
            {
              "name": "value",
              "descriptor": "()I",
              "flags": 9,
              "metadata": [],
              "code": {
                "maxStack": 0,
                "maxLocals": 0,
                "codeLength": 1,
                "operations": [
                  {
                    "pc": 0,
                    "opcode": "ireturn",
                    "length": 1
                  }
                ],
                "handlers": [],
                "attributes": []
              }
            }
          ],
          "attributes": []
        }
      }
    ]
  },
  {
    "id": "phase-excluded-Class",
    "event": "empty;byte/model=equal;list=immutable;definition=never",
    "profileLine": "PROFILE|phase-excluded-Class|major=69|bytes=0|model=0|categories=empty",
    "categories": [],
    "messageCount": 0,
    "messageCategories": [],
    "initializationDebug": false,
    "parserArgumentCallback": false,
    "sourceGroup": "excludedOwners",
    "sourceGroupDescriptor": "()V",
    "outputOrder": [
      "artifact",
      "profile",
      "case"
    ],
    "artifacts": [
      {
        "id": "phase-excluded-Class",
        "definition": "never-define",
        "profile": {
          "className": "java.lang.Class",
          "major": 69,
          "minor": 0,
          "flags": 33,
          "superclass": "java.lang.Object",
          "interfaces": [],
          "fields": [],
          "methods": [
            {
              "name": "value",
              "descriptor": "()I",
              "flags": 9,
              "metadata": [],
              "code": {
                "maxStack": 0,
                "maxLocals": 0,
                "codeLength": 1,
                "operations": [
                  {
                    "pc": 0,
                    "opcode": "ireturn",
                    "length": 1
                  }
                ],
                "handlers": [],
                "attributes": []
              }
            }
          ],
          "attributes": []
        }
      }
    ]
  },
  {
    "id": "phase-excluded-parser-Class",
    "event": "parser-constant;byte/model=equal;list=immutable;definition=never",
    "profileLine": "PROFILE|phase-excluded-parser-Class|major=69|bytes=1|model=1|categories=parser-constant",
    "categories": [
      "parser-constant"
    ],
    "messageCount": 1,
    "messageCategories": [
      "parser-constant"
    ],
    "initializationDebug": false,
    "parserArgumentCallback": false,
    "sourceGroup": "excludedOwners",
    "sourceGroupDescriptor": "()V",
    "outputOrder": [
      "artifact",
      "profile",
      "message",
      "case"
    ],
    "artifacts": [
      {
        "id": "phase-excluded-parser-Class",
        "definition": "never-define",
        "profile": {
          "className": "java.lang.Class",
          "major": 69,
          "minor": 0,
          "flags": 33,
          "superclass": "java.lang.Object",
          "interfaces": [],
          "fields": [
            {
              "name": "wrongConstant",
              "descriptor": "Ljava/lang/String;",
              "flags": 25,
              "attributes": [
                {
                  "name": "ConstantValue",
                  "contents": {
                    "tag": 3,
                    "value": 7
                  }
                }
              ]
            }
          ],
          "methods": [
            {
              "name": "value",
              "descriptor": "()I",
              "flags": 9,
              "metadata": [],
              "code": {
                "maxStack": 0,
                "maxLocals": 0,
                "codeLength": 1,
                "operations": [
                  {
                    "pc": 0,
                    "opcode": "ireturn",
                    "length": 1
                  }
                ],
                "handlers": [],
                "attributes": []
              }
            }
          ],
          "attributes": []
        }
      }
    ]
  },
  {
    "id": "phase-excluded-String",
    "event": "empty;byte/model=equal;list=immutable;definition=never",
    "profileLine": "PROFILE|phase-excluded-String|major=69|bytes=0|model=0|categories=empty",
    "categories": [],
    "messageCount": 0,
    "messageCategories": [],
    "initializationDebug": false,
    "parserArgumentCallback": false,
    "sourceGroup": "excludedOwners",
    "sourceGroupDescriptor": "()V",
    "outputOrder": [
      "artifact",
      "profile",
      "case"
    ],
    "artifacts": [
      {
        "id": "phase-excluded-String",
        "definition": "never-define",
        "profile": {
          "className": "java.lang.String",
          "major": 69,
          "minor": 0,
          "flags": 33,
          "superclass": "java.lang.Object",
          "interfaces": [],
          "fields": [],
          "methods": [
            {
              "name": "value",
              "descriptor": "()I",
              "flags": 9,
              "metadata": [],
              "code": {
                "maxStack": 0,
                "maxLocals": 0,
                "codeLength": 1,
                "operations": [
                  {
                    "pc": 0,
                    "opcode": "ireturn",
                    "length": 1
                  }
                ],
                "handlers": [],
                "attributes": []
              }
            }
          ],
          "attributes": []
        }
      }
    ]
  },
  {
    "id": "phase-excluded-parser-String",
    "event": "parser-constant;byte/model=equal;list=immutable;definition=never",
    "profileLine": "PROFILE|phase-excluded-parser-String|major=69|bytes=1|model=1|categories=parser-constant",
    "categories": [
      "parser-constant"
    ],
    "messageCount": 1,
    "messageCategories": [
      "parser-constant"
    ],
    "initializationDebug": false,
    "parserArgumentCallback": false,
    "sourceGroup": "excludedOwners",
    "sourceGroupDescriptor": "()V",
    "outputOrder": [
      "artifact",
      "profile",
      "message",
      "case"
    ],
    "artifacts": [
      {
        "id": "phase-excluded-parser-String",
        "definition": "never-define",
        "profile": {
          "className": "java.lang.String",
          "major": 69,
          "minor": 0,
          "flags": 33,
          "superclass": "java.lang.Object",
          "interfaces": [],
          "fields": [
            {
              "name": "wrongConstant",
              "descriptor": "Ljava/lang/String;",
              "flags": 25,
              "attributes": [
                {
                  "name": "ConstantValue",
                  "contents": {
                    "tag": 3,
                    "value": 7
                  }
                }
              ]
            }
          ],
          "methods": [
            {
              "name": "value",
              "descriptor": "()I",
              "flags": 9,
              "metadata": [],
              "code": {
                "maxStack": 0,
                "maxLocals": 0,
                "codeLength": 1,
                "operations": [
                  {
                    "pc": 0,
                    "opcode": "ireturn",
                    "length": 1
                  }
                ],
                "handlers": [],
                "attributes": []
              }
            }
          ],
          "attributes": []
        }
      }
    ]
  },
  {
    "id": "phase-excluded-Throwable",
    "event": "empty;byte/model=equal;list=immutable;definition=never",
    "profileLine": "PROFILE|phase-excluded-Throwable|major=69|bytes=0|model=0|categories=empty",
    "categories": [],
    "messageCount": 0,
    "messageCategories": [],
    "initializationDebug": false,
    "parserArgumentCallback": false,
    "sourceGroup": "excludedOwners",
    "sourceGroupDescriptor": "()V",
    "outputOrder": [
      "artifact",
      "profile",
      "case"
    ],
    "artifacts": [
      {
        "id": "phase-excluded-Throwable",
        "definition": "never-define",
        "profile": {
          "className": "java.lang.Throwable",
          "major": 69,
          "minor": 0,
          "flags": 33,
          "superclass": "java.lang.Object",
          "interfaces": [],
          "fields": [],
          "methods": [
            {
              "name": "value",
              "descriptor": "()I",
              "flags": 9,
              "metadata": [],
              "code": {
                "maxStack": 0,
                "maxLocals": 0,
                "codeLength": 1,
                "operations": [
                  {
                    "pc": 0,
                    "opcode": "ireturn",
                    "length": 1
                  }
                ],
                "handlers": [],
                "attributes": []
              }
            }
          ],
          "attributes": []
        }
      }
    ]
  },
  {
    "id": "phase-excluded-parser-Throwable",
    "event": "parser-constant;byte/model=equal;list=immutable;definition=never",
    "profileLine": "PROFILE|phase-excluded-parser-Throwable|major=69|bytes=1|model=1|categories=parser-constant",
    "categories": [
      "parser-constant"
    ],
    "messageCount": 1,
    "messageCategories": [
      "parser-constant"
    ],
    "initializationDebug": false,
    "parserArgumentCallback": false,
    "sourceGroup": "excludedOwners",
    "sourceGroupDescriptor": "()V",
    "outputOrder": [
      "artifact",
      "profile",
      "message",
      "case"
    ],
    "artifacts": [
      {
        "id": "phase-excluded-parser-Throwable",
        "definition": "never-define",
        "profile": {
          "className": "java.lang.Throwable",
          "major": 69,
          "minor": 0,
          "flags": 33,
          "superclass": "java.lang.Object",
          "interfaces": [],
          "fields": [
            {
              "name": "wrongConstant",
              "descriptor": "Ljava/lang/String;",
              "flags": 25,
              "attributes": [
                {
                  "name": "ConstantValue",
                  "contents": {
                    "tag": 3,
                    "value": 7
                  }
                }
              ]
            }
          ],
          "methods": [
            {
              "name": "value",
              "descriptor": "()I",
              "flags": 9,
              "metadata": [],
              "code": {
                "maxStack": 0,
                "maxLocals": 0,
                "codeLength": 1,
                "operations": [
                  {
                    "pc": 0,
                    "opcode": "ireturn",
                    "length": 1
                  }
                ],
                "handlers": [],
                "attributes": []
              }
            }
          ],
          "attributes": []
        }
      }
    ]
  },
  {
    "id": "phase-resolver50-IllegalArgumentException",
    "event": "inference;byte/model=equal;list=immutable;definition=never",
    "profileLine": "PROFILE|phase-resolver50-IllegalArgumentException|major=50|bytes=1|model=1|categories=inference",
    "categories": [
      "inference"
    ],
    "messageCount": 1,
    "messageCategories": [
      "inference"
    ],
    "initializationDebug": false,
    "parserArgumentCallback": false,
    "sourceGroup": "resolvers",
    "sourceGroupDescriptor": "()V",
    "outputOrder": [
      "artifact",
      "profile",
      "message",
      "case"
    ],
    "artifacts": [
      {
        "id": "phase-resolver50-IllegalArgumentException",
        "definition": "never-define",
        "profile": {
          "className": "classes.modern_test.Phase_phase_resolver50_IllegalArgumentException",
          "major": 50,
          "minor": 0,
          "flags": 33,
          "superclass": "java.lang.Object",
          "interfaces": [],
          "fields": [],
          "methods": [
            {
              "name": "reference",
              "descriptor": "(Ljava/lang/String;)Ljava/lang/Number;",
              "flags": 9,
              "metadata": [],
              "code": {
                "maxStack": 1,
                "maxLocals": 1,
                "codeLength": 2,
                "operations": [
                  {
                    "pc": 0,
                    "opcode": "aload_0",
                    "length": 1
                  },
                  {
                    "pc": 1,
                    "opcode": "areturn",
                    "length": 1
                  }
                ],
                "handlers": [],
                "attributes": []
              }
            },
            {
              "name": "later",
              "descriptor": "()I",
              "flags": 9,
              "metadata": [],
              "code": {
                "maxStack": 0,
                "maxLocals": 0,
                "codeLength": 1,
                "operations": [
                  {
                    "pc": 0,
                    "opcode": "ireturn",
                    "length": 1
                  }
                ],
                "handlers": [],
                "attributes": []
              }
            }
          ],
          "attributes": []
        }
      }
    ]
  },
  {
    "id": "phase-resolver50-IllegalStateException",
    "event": "inference;byte/model=equal;list=immutable;definition=never",
    "profileLine": "PROFILE|phase-resolver50-IllegalStateException|major=50|bytes=1|model=1|categories=inference",
    "categories": [
      "inference"
    ],
    "messageCount": 1,
    "messageCategories": [
      "inference"
    ],
    "initializationDebug": false,
    "parserArgumentCallback": false,
    "sourceGroup": "resolvers",
    "sourceGroupDescriptor": "()V",
    "outputOrder": [
      "artifact",
      "profile",
      "message",
      "case"
    ],
    "artifacts": [
      {
        "id": "phase-resolver50-IllegalStateException",
        "definition": "never-define",
        "profile": {
          "className": "classes.modern_test.Phase_phase_resolver50_IllegalStateException",
          "major": 50,
          "minor": 0,
          "flags": 33,
          "superclass": "java.lang.Object",
          "interfaces": [],
          "fields": [],
          "methods": [
            {
              "name": "reference",
              "descriptor": "(Ljava/lang/String;)Ljava/lang/Number;",
              "flags": 9,
              "metadata": [],
              "code": {
                "maxStack": 1,
                "maxLocals": 1,
                "codeLength": 2,
                "operations": [
                  {
                    "pc": 0,
                    "opcode": "aload_0",
                    "length": 1
                  },
                  {
                    "pc": 1,
                    "opcode": "areturn",
                    "length": 1
                  }
                ],
                "handlers": [],
                "attributes": []
              }
            },
            {
              "name": "later",
              "descriptor": "()I",
              "flags": 9,
              "metadata": [],
              "code": {
                "maxStack": 0,
                "maxLocals": 0,
                "codeLength": 1,
                "operations": [
                  {
                    "pc": 0,
                    "opcode": "ireturn",
                    "length": 1
                  }
                ],
                "handlers": [],
                "attributes": []
              }
            }
          ],
          "attributes": []
        }
      }
    ]
  },
  {
    "id": "phase-resolver50-AssertionError",
    "event": "inference;byte/model=equal;list=immutable;definition=never",
    "profileLine": "PROFILE|phase-resolver50-AssertionError|major=50|bytes=1|model=1|categories=inference",
    "categories": [
      "inference"
    ],
    "messageCount": 1,
    "messageCategories": [
      "inference"
    ],
    "initializationDebug": false,
    "parserArgumentCallback": false,
    "sourceGroup": "resolvers",
    "sourceGroupDescriptor": "()V",
    "outputOrder": [
      "artifact",
      "profile",
      "message",
      "case"
    ],
    "artifacts": [
      {
        "id": "phase-resolver50-AssertionError",
        "definition": "never-define",
        "profile": {
          "className": "classes.modern_test.Phase_phase_resolver50_AssertionError",
          "major": 50,
          "minor": 0,
          "flags": 33,
          "superclass": "java.lang.Object",
          "interfaces": [],
          "fields": [],
          "methods": [
            {
              "name": "reference",
              "descriptor": "(Ljava/lang/String;)Ljava/lang/Number;",
              "flags": 9,
              "metadata": [],
              "code": {
                "maxStack": 1,
                "maxLocals": 1,
                "codeLength": 2,
                "operations": [
                  {
                    "pc": 0,
                    "opcode": "aload_0",
                    "length": 1
                  },
                  {
                    "pc": 1,
                    "opcode": "areturn",
                    "length": 1
                  }
                ],
                "handlers": [],
                "attributes": []
              }
            },
            {
              "name": "later",
              "descriptor": "()I",
              "flags": 9,
              "metadata": [],
              "code": {
                "maxStack": 0,
                "maxLocals": 0,
                "codeLength": 1,
                "operations": [
                  {
                    "pc": 0,
                    "opcode": "ireturn",
                    "length": 1
                  }
                ],
                "handlers": [],
                "attributes": []
              }
            }
          ],
          "attributes": []
        }
      }
    ]
  },
  {
    "id": "phase-resolver69-IllegalArgumentException",
    "event": "resolver-IllegalArgumentException,byte-underflow;byte/model=equal;list=immutable;definition=never",
    "profileLine": "PROFILE|phase-resolver69-IllegalArgumentException|major=69|bytes=2|model=2|categories=resolver-IllegalArgumentException,byte-underflow",
    "categories": [
      "resolver-IllegalArgumentException",
      "byte-underflow"
    ],
    "messageCount": 2,
    "messageCategories": [
      "resolver-IllegalArgumentException",
      "byte-underflow"
    ],
    "initializationDebug": false,
    "parserArgumentCallback": false,
    "sourceGroup": "resolvers",
    "sourceGroupDescriptor": "()V",
    "outputOrder": [
      "artifact",
      "profile",
      "message",
      "message",
      "case"
    ],
    "artifacts": [
      {
        "id": "phase-resolver69-IllegalArgumentException",
        "definition": "never-define",
        "profile": {
          "className": "classes.modern_test.Phase_phase_resolver69_IllegalArgumentException",
          "major": 69,
          "minor": 0,
          "flags": 33,
          "superclass": "java.lang.Object",
          "interfaces": [],
          "fields": [],
          "methods": [
            {
              "name": "reference",
              "descriptor": "(Ljava/lang/String;)Ljava/lang/Number;",
              "flags": 9,
              "metadata": [],
              "code": {
                "maxStack": 1,
                "maxLocals": 1,
                "codeLength": 2,
                "operations": [
                  {
                    "pc": 0,
                    "opcode": "aload_0",
                    "length": 1
                  },
                  {
                    "pc": 1,
                    "opcode": "areturn",
                    "length": 1
                  }
                ],
                "handlers": [],
                "attributes": []
              }
            },
            {
              "name": "later",
              "descriptor": "()I",
              "flags": 9,
              "metadata": [],
              "code": {
                "maxStack": 0,
                "maxLocals": 0,
                "codeLength": 1,
                "operations": [
                  {
                    "pc": 0,
                    "opcode": "ireturn",
                    "length": 1
                  }
                ],
                "handlers": [],
                "attributes": []
              }
            }
          ],
          "attributes": []
        }
      }
    ]
  },
  {
    "id": "phase-resolver69-IllegalStateException",
    "event": "resolver-IllegalStateException,byte-underflow;byte/model=equal;list=immutable;definition=never",
    "profileLine": "PROFILE|phase-resolver69-IllegalStateException|major=69|bytes=2|model=2|categories=resolver-IllegalStateException,byte-underflow",
    "categories": [
      "resolver-IllegalStateException",
      "byte-underflow"
    ],
    "messageCount": 2,
    "messageCategories": [
      "resolver-IllegalStateException",
      "byte-underflow"
    ],
    "initializationDebug": false,
    "parserArgumentCallback": false,
    "sourceGroup": "resolvers",
    "sourceGroupDescriptor": "()V",
    "outputOrder": [
      "artifact",
      "profile",
      "message",
      "message",
      "case"
    ],
    "artifacts": [
      {
        "id": "phase-resolver69-IllegalStateException",
        "definition": "never-define",
        "profile": {
          "className": "classes.modern_test.Phase_phase_resolver69_IllegalStateException",
          "major": 69,
          "minor": 0,
          "flags": 33,
          "superclass": "java.lang.Object",
          "interfaces": [],
          "fields": [],
          "methods": [
            {
              "name": "reference",
              "descriptor": "(Ljava/lang/String;)Ljava/lang/Number;",
              "flags": 9,
              "metadata": [],
              "code": {
                "maxStack": 1,
                "maxLocals": 1,
                "codeLength": 2,
                "operations": [
                  {
                    "pc": 0,
                    "opcode": "aload_0",
                    "length": 1
                  },
                  {
                    "pc": 1,
                    "opcode": "areturn",
                    "length": 1
                  }
                ],
                "handlers": [],
                "attributes": []
              }
            },
            {
              "name": "later",
              "descriptor": "()I",
              "flags": 9,
              "metadata": [],
              "code": {
                "maxStack": 0,
                "maxLocals": 0,
                "codeLength": 1,
                "operations": [
                  {
                    "pc": 0,
                    "opcode": "ireturn",
                    "length": 1
                  }
                ],
                "handlers": [],
                "attributes": []
              }
            }
          ],
          "attributes": []
        }
      }
    ]
  },
  {
    "id": "phase-resolver69-AssertionError",
    "event": "resolver-AssertionError,byte-underflow;byte/model=equal;list=immutable;definition=never",
    "profileLine": "PROFILE|phase-resolver69-AssertionError|major=69|bytes=2|model=2|categories=resolver-AssertionError,byte-underflow",
    "categories": [
      "resolver-AssertionError",
      "byte-underflow"
    ],
    "messageCount": 2,
    "messageCategories": [
      "resolver-AssertionError",
      "byte-underflow"
    ],
    "initializationDebug": false,
    "parserArgumentCallback": false,
    "sourceGroup": "resolvers",
    "sourceGroupDescriptor": "()V",
    "outputOrder": [
      "artifact",
      "profile",
      "message",
      "message",
      "case"
    ],
    "artifacts": [
      {
        "id": "phase-resolver69-AssertionError",
        "definition": "never-define",
        "profile": {
          "className": "classes.modern_test.Phase_phase_resolver69_AssertionError",
          "major": 69,
          "minor": 0,
          "flags": 33,
          "superclass": "java.lang.Object",
          "interfaces": [],
          "fields": [],
          "methods": [
            {
              "name": "reference",
              "descriptor": "(Ljava/lang/String;)Ljava/lang/Number;",
              "flags": 9,
              "metadata": [],
              "code": {
                "maxStack": 1,
                "maxLocals": 1,
                "codeLength": 2,
                "operations": [
                  {
                    "pc": 0,
                    "opcode": "aload_0",
                    "length": 1
                  },
                  {
                    "pc": 1,
                    "opcode": "areturn",
                    "length": 1
                  }
                ],
                "handlers": [],
                "attributes": []
              }
            },
            {
              "name": "later",
              "descriptor": "()I",
              "flags": 9,
              "metadata": [],
              "code": {
                "maxStack": 0,
                "maxLocals": 0,
                "codeLength": 1,
                "operations": [
                  {
                    "pc": 0,
                    "opcode": "ireturn",
                    "length": 1
                  }
                ],
                "handlers": [],
                "attributes": []
              }
            }
          ],
          "attributes": []
        }
      }
    ]
  },
  {
    "id": "phase-bridge-resolver50",
    "event": "empty;byte/model=equal;list=immutable;definition=never",
    "profileLine": "PROFILE|phase-bridge-resolver50|major=50|bytes=0|model=0|categories=empty",
    "categories": [],
    "messageCount": 0,
    "messageCategories": [],
    "initializationDebug": false,
    "parserArgumentCallback": false,
    "sourceGroup": "resolvers",
    "sourceGroupDescriptor": "()V",
    "outputOrder": [
      "artifact",
      "profile",
      "case"
    ],
    "artifacts": [
      {
        "id": "phase-bridge-resolver50",
        "definition": "never-define",
        "profile": {
          "className": "classes.modern_test.Phase_phase_bridge_resolver50",
          "major": 50,
          "minor": 0,
          "flags": 33,
          "superclass": "java.lang.Object",
          "interfaces": [],
          "fields": [],
          "methods": [
            {
              "name": "reference",
              "descriptor": "(Ljava/lang/String;)Ljava/lang/Number;",
              "flags": 73,
              "metadata": [],
              "code": {
                "maxStack": 1,
                "maxLocals": 1,
                "codeLength": 2,
                "operations": [
                  {
                    "pc": 0,
                    "opcode": "aload_0",
                    "length": 1
                  },
                  {
                    "pc": 1,
                    "opcode": "areturn",
                    "length": 1
                  }
                ],
                "handlers": [],
                "attributes": []
              }
            }
          ],
          "attributes": []
        }
      }
    ]
  },
  {
    "id": "phase-bridge-resolver69",
    "event": "empty;byte/model=equal;list=immutable;definition=never",
    "profileLine": "PROFILE|phase-bridge-resolver69|major=69|bytes=0|model=0|categories=empty",
    "categories": [],
    "messageCount": 0,
    "messageCategories": [],
    "initializationDebug": false,
    "parserArgumentCallback": false,
    "sourceGroup": "resolvers",
    "sourceGroupDescriptor": "()V",
    "outputOrder": [
      "artifact",
      "profile",
      "case"
    ],
    "artifacts": [
      {
        "id": "phase-bridge-resolver69",
        "definition": "never-define",
        "profile": {
          "className": "classes.modern_test.Phase_phase_bridge_resolver69",
          "major": 69,
          "minor": 0,
          "flags": 33,
          "superclass": "java.lang.Object",
          "interfaces": [],
          "fields": [],
          "methods": [
            {
              "name": "reference",
              "descriptor": "(Ljava/lang/String;)Ljava/lang/Number;",
              "flags": 73,
              "metadata": [],
              "code": {
                "maxStack": 1,
                "maxLocals": 1,
                "codeLength": 2,
                "operations": [
                  {
                    "pc": 0,
                    "opcode": "aload_0",
                    "length": 1
                  },
                  {
                    "pc": 1,
                    "opcode": "areturn",
                    "length": 1
                  }
                ],
                "handlers": [],
                "attributes": []
              }
            }
          ],
          "attributes": []
        }
      }
    ]
  },
  {
    "id": "phase-parser-callback-VerifyError",
    "event": "parser-VerifyError-identity;byte/model=equal;list=immutable;definition=never",
    "profileLine": "PROFILE|phase-parser-callback-VerifyError|major=69|bytes=throws-VerifyError|model=throws-VerifyError|categories=parser-VerifyError-identity",
    "categories": [
      "parser-VerifyError-identity"
    ],
    "messageCount": 0,
    "messageCategories": [],
    "initializationDebug": false,
    "parserArgumentCallback": false,
    "sourceGroup": "parserCallbacks",
    "sourceGroupDescriptor": "()V",
    "outputOrder": [
      "artifact",
      "profile",
      "case"
    ],
    "artifacts": [
      {
        "id": "phase-parser-callback-VerifyError",
        "definition": "never-define",
        "profile": {
          "className": "classes.modern_test.Phase_phase_parser_callback_VerifyError",
          "major": 69,
          "minor": 0,
          "flags": 33,
          "superclass": "java.lang.Object",
          "interfaces": [],
          "fields": [],
          "methods": [],
          "attributes": [
            {
              "name": "PhaseParserCallback",
              "contents": []
            }
          ]
        }
      }
    ]
  },
  {
    "id": "phase-parser-callback-IAE",
    "event": "parser-IAE-singleton;byte/model=equal;list=immutable;definition=never",
    "profileLine": "PROFILE|phase-parser-callback-IAE|major=69|bytes=1|model=1|categories=parser-IAE-singleton",
    "categories": [
      "parser-IAE-singleton"
    ],
    "messageCount": 1,
    "messageCategories": [
      "parser-IAE-singleton"
    ],
    "initializationDebug": false,
    "parserArgumentCallback": true,
    "parserArgumentMessage": "phase-parser-held-IAE",
    "sourceGroup": "parserCallbacks",
    "sourceGroupDescriptor": "()V",
    "outputOrder": [
      "message",
      "artifact",
      "profile",
      "case"
    ],
    "artifacts": [
      {
        "id": "phase-parser-callback-IAE",
        "definition": "never-define",
        "profile": {
          "className": "classes.modern_test.Phase_phase_parser_callback_IAE",
          "major": 69,
          "minor": 0,
          "flags": 33,
          "superclass": "java.lang.Object",
          "interfaces": [],
          "fields": [],
          "methods": [],
          "attributes": [
            {
              "name": "PhaseParserCallback",
              "contents": []
            }
          ]
        }
      }
    ]
  },
  {
    "id": "phase-parser-callback-IAE-after-duplicate",
    "event": "parser-IAE-singleton;byte/model=equal;list=immutable;definition=never",
    "profileLine": "PROFILE|phase-parser-callback-IAE-after-duplicate|major=69|bytes=1|model=1|categories=parser-IAE-singleton",
    "categories": [
      "parser-IAE-singleton"
    ],
    "messageCount": 1,
    "messageCategories": [
      "parser-IAE-singleton"
    ],
    "initializationDebug": false,
    "parserArgumentCallback": true,
    "parserArgumentMessage": "phase-parser-held-IAE",
    "sourceGroup": "parserCallbacks",
    "sourceGroupDescriptor": "()V",
    "outputOrder": [
      "message",
      "artifact",
      "profile",
      "case"
    ],
    "artifacts": [
      {
        "id": "phase-parser-callback-IAE-after-duplicate",
        "definition": "never-define",
        "profile": {
          "className": "classes.modern_test.Phase_phase_parser_callback_IAE_after_duplicate",
          "major": 69,
          "minor": 0,
          "flags": 33,
          "superclass": "java.lang.Object",
          "interfaces": [
            "java.io.Serializable",
            "java.io.Serializable"
          ],
          "fields": [],
          "methods": [],
          "attributes": [
            {
              "name": "PhaseParserCallback",
              "contents": []
            }
          ]
        }
      }
    ]
  },
  {
    "id": "phase-jsr-lvt-first69",
    "event": "byte-lvt;byte/model=equal;list=immutable;definition=never",
    "profileLine": "PROFILE|phase-jsr-lvt-first69|major=69|bytes=1|model=1|categories=byte-lvt",
    "categories": [
      "byte-lvt"
    ],
    "messageCount": 1,
    "messageCategories": [
      "byte-lvt"
    ],
    "initializationDebug": false,
    "parserArgumentCallback": false,
    "sourceGroup": "jsrLvtOrdering",
    "sourceGroupDescriptor": "()V",
    "outputOrder": [
      "artifact",
      "profile",
      "message",
      "case"
    ],
    "artifacts": [
      {
        "id": "phase-jsr-lvt-first69",
        "definition": "never-define",
        "profile": {
          "className": "classes.modern_test.Phase_phase_jsr_lvt_first69",
          "major": 69,
          "minor": 0,
          "flags": 33,
          "superclass": "java.lang.Object",
          "interfaces": [],
          "fields": [],
          "methods": [
            {
              "name": "value",
              "descriptor": "()I",
              "flags": 9,
              "metadata": [],
              "code": {
                "maxStack": 2,
                "maxLocals": 1,
                "codeLength": 8,
                "operations": [
                  {
                    "pc": 0,
                    "opcode": "jsr",
                    "length": 3,
                    "branchTarget": 5
                  },
                  {
                    "pc": 3,
                    "opcode": "iconst_1",
                    "length": 1
                  },
                  {
                    "pc": 4,
                    "opcode": "ireturn",
                    "length": 1
                  },
                  {
                    "pc": 5,
                    "opcode": "astore_0",
                    "length": 1
                  },
                  {
                    "pc": 6,
                    "opcode": "ret",
                    "length": 2,
                    "localIndex": 0
                  }
                ],
                "handlers": [],
                "attributes": [
                  {
                    "name": "LocalVariableTable",
                    "contents": [
                      {
                        "start": 1,
                        "length": 3,
                        "name": "x",
                        "type": "I",
                        "slot": 0
                      }
                    ]
                  }
                ]
              }
            }
          ],
          "attributes": []
        }
      }
    ]
  },
  {
    "id": "phase-jsr-lvt-fallback50",
    "event": "inference;byte/model=equal;list=immutable;definition=never",
    "profileLine": "PROFILE|phase-jsr-lvt-fallback50|major=50|bytes=1|model=1|categories=inference",
    "categories": [
      "inference"
    ],
    "messageCount": 1,
    "messageCategories": [
      "inference"
    ],
    "initializationDebug": false,
    "parserArgumentCallback": false,
    "sourceGroup": "jsrLvtOrdering",
    "sourceGroupDescriptor": "()V",
    "outputOrder": [
      "artifact",
      "profile",
      "message",
      "case"
    ],
    "artifacts": [
      {
        "id": "phase-jsr-lvt-fallback50",
        "definition": "never-define",
        "profile": {
          "className": "classes.modern_test.Phase_phase_jsr_lvt_fallback50",
          "major": 50,
          "minor": 0,
          "flags": 33,
          "superclass": "java.lang.Object",
          "interfaces": [],
          "fields": [],
          "methods": [
            {
              "name": "value",
              "descriptor": "()I",
              "flags": 9,
              "metadata": [],
              "code": {
                "maxStack": 2,
                "maxLocals": 1,
                "codeLength": 8,
                "operations": [
                  {
                    "pc": 0,
                    "opcode": "jsr",
                    "length": 3,
                    "branchTarget": 5
                  },
                  {
                    "pc": 3,
                    "opcode": "iconst_1",
                    "length": 1
                  },
                  {
                    "pc": 4,
                    "opcode": "ireturn",
                    "length": 1
                  },
                  {
                    "pc": 5,
                    "opcode": "astore_0",
                    "length": 1
                  },
                  {
                    "pc": 6,
                    "opcode": "ret",
                    "length": 2,
                    "localIndex": 0
                  }
                ],
                "handlers": [],
                "attributes": [
                  {
                    "name": "LocalVariableTable",
                    "contents": [
                      {
                        "start": 1,
                        "length": 3,
                        "name": "x",
                        "type": "I",
                        "slot": 0
                      }
                    ]
                  }
                ]
              }
            }
          ],
          "attributes": []
        }
      }
    ]
  },
  {
    "id": "phase-bridge-jsr-lvt69",
    "event": "empty;byte/model=equal;list=immutable;definition=never",
    "profileLine": "PROFILE|phase-bridge-jsr-lvt69|major=69|bytes=0|model=0|categories=empty",
    "categories": [],
    "messageCount": 0,
    "messageCategories": [],
    "initializationDebug": false,
    "parserArgumentCallback": false,
    "sourceGroup": "jsrLvtOrdering",
    "sourceGroupDescriptor": "()V",
    "outputOrder": [
      "artifact",
      "profile",
      "case"
    ],
    "artifacts": [
      {
        "id": "phase-bridge-jsr-lvt69",
        "definition": "never-define",
        "profile": {
          "className": "classes.modern_test.Phase_phase_bridge_jsr_lvt69",
          "major": 69,
          "minor": 0,
          "flags": 33,
          "superclass": "java.lang.Object",
          "interfaces": [],
          "fields": [],
          "methods": [
            {
              "name": "value",
              "descriptor": "()I",
              "flags": 73,
              "metadata": [],
              "code": {
                "maxStack": 2,
                "maxLocals": 1,
                "codeLength": 8,
                "operations": [
                  {
                    "pc": 0,
                    "opcode": "jsr",
                    "length": 3,
                    "branchTarget": 5
                  },
                  {
                    "pc": 3,
                    "opcode": "iconst_1",
                    "length": 1
                  },
                  {
                    "pc": 4,
                    "opcode": "ireturn",
                    "length": 1
                  },
                  {
                    "pc": 5,
                    "opcode": "astore_0",
                    "length": 1
                  },
                  {
                    "pc": 6,
                    "opcode": "ret",
                    "length": 2,
                    "localIndex": 0
                  }
                ],
                "handlers": [],
                "attributes": [
                  {
                    "name": "LocalVariableTable",
                    "contents": [
                      {
                        "start": 1,
                        "length": 3,
                        "name": "x",
                        "type": "I",
                        "slot": 0
                      }
                    ]
                  }
                ]
              }
            }
          ],
          "attributes": []
        }
      }
    ]
  },
  {
    "id": "phase-object-ctor-auto",
    "event": "empty;byte/model=equal;list=immutable;definition=never",
    "profileLine": "PROFILE|phase-object-ctor-auto|major=69|bytes=0|model=0|categories=empty",
    "categories": [],
    "messageCount": 0,
    "messageCategories": [],
    "initializationDebug": false,
    "parserArgumentCallback": false,
    "sourceGroup": "objectConstructors",
    "sourceGroupDescriptor": "()V",
    "outputOrder": [
      "artifact",
      "profile",
      "case"
    ],
    "artifacts": [
      {
        "id": "phase-object-ctor-auto",
        "definition": "never-define",
        "profile": {
          "className": "java.lang.Object",
          "major": 69,
          "minor": 0,
          "flags": 33,
          "superclass": null,
          "interfaces": [],
          "fields": [],
          "methods": [
            {
              "name": "<init>",
              "descriptor": "()V",
              "flags": 1,
              "metadata": [],
              "code": {
                "maxStack": 0,
                "maxLocals": 1,
                "codeLength": 1,
                "operations": [
                  {
                    "pc": 0,
                    "opcode": "return",
                    "length": 1
                  }
                ],
                "handlers": [],
                "attributes": []
              }
            }
          ],
          "attributes": []
        }
      }
    ]
  },
  {
    "id": "phase-object-ctor-generate",
    "event": "empty;byte/model=equal;list=immutable;definition=never",
    "profileLine": "PROFILE|phase-object-ctor-generate|major=69|bytes=0|model=0|categories=empty",
    "categories": [],
    "messageCount": 0,
    "messageCategories": [],
    "initializationDebug": false,
    "parserArgumentCallback": false,
    "sourceGroup": "objectConstructors",
    "sourceGroupDescriptor": "()V",
    "outputOrder": [
      "artifact",
      "profile",
      "case"
    ],
    "artifacts": [
      {
        "id": "phase-object-ctor-generate",
        "definition": "never-define",
        "profile": {
          "className": "java.lang.Object",
          "major": 69,
          "minor": 0,
          "flags": 33,
          "superclass": null,
          "interfaces": [],
          "fields": [],
          "methods": [
            {
              "name": "<init>",
              "descriptor": "()V",
              "flags": 1,
              "metadata": [],
              "code": {
                "maxStack": 0,
                "maxLocals": 1,
                "codeLength": 1,
                "operations": [
                  {
                    "pc": 0,
                    "opcode": "return",
                    "length": 1
                  }
                ],
                "handlers": [],
                "attributes": []
              }
            }
          ],
          "attributes": []
        }
      }
    ]
  },
  {
    "id": "phase-object-ctor-drop",
    "event": "empty;byte/model=equal;list=immutable;definition=never",
    "profileLine": "PROFILE|phase-object-ctor-drop|major=69|bytes=0|model=0|categories=empty",
    "categories": [],
    "messageCount": 0,
    "messageCategories": [],
    "initializationDebug": false,
    "parserArgumentCallback": false,
    "sourceGroup": "objectConstructors",
    "sourceGroupDescriptor": "()V",
    "outputOrder": [
      "artifact",
      "profile",
      "case"
    ],
    "artifacts": [
      {
        "id": "phase-object-ctor-drop",
        "definition": "never-define",
        "profile": {
          "className": "java.lang.Object",
          "major": 69,
          "minor": 0,
          "flags": 33,
          "superclass": null,
          "interfaces": [],
          "fields": [],
          "methods": [
            {
              "name": "<init>",
              "descriptor": "()V",
              "flags": 1,
              "metadata": [],
              "code": {
                "maxStack": 0,
                "maxLocals": 1,
                "codeLength": 1,
                "operations": [
                  {
                    "pc": 0,
                    "opcode": "return",
                    "length": 1
                  }
                ],
                "handlers": [],
                "attributes": []
              }
            }
          ],
          "attributes": []
        }
      }
    ]
  },
  {
    "id": "phase-parser-name-multiple",
    "event": "empty;byte/model=equal;list=immutable;definition=never",
    "profileLine": "PROFILE|phase-parser-name-multiple|major=69|bytes=0|model=0|categories=empty",
    "categories": [],
    "messageCount": 0,
    "messageCategories": [],
    "initializationDebug": false,
    "parserArgumentCallback": false,
    "sourceGroup": "parserNameOrder",
    "sourceGroupDescriptor": "()V",
    "outputOrder": [
      "artifact",
      "profile",
      "case"
    ],
    "artifacts": [
      {
        "id": "phase-parser-name-multiple",
        "definition": "never-define",
        "profile": {
          "className": "classes.modern_test.Phase_phase_parser_name_multiple",
          "major": 69,
          "minor": 0,
          "flags": 33,
          "superclass": "java.lang.Object",
          "interfaces": [],
          "fields": [],
          "methods": [],
          "attributes": [
            {
              "name": "PhaseParserNameCallback",
              "contents": []
            }
          ]
        }
      }
    ]
  },
  {
    "id": "phase-parser-name-short-circuit",
    "event": "parser-VerifyError-identity;byte/model=equal;list=immutable;definition=never",
    "profileLine": "PROFILE|phase-parser-name-short-circuit|major=69|bytes=throws-VerifyError|model=throws-VerifyError|categories=parser-VerifyError-identity",
    "categories": [
      "parser-VerifyError-identity"
    ],
    "messageCount": 0,
    "messageCategories": [],
    "initializationDebug": false,
    "parserArgumentCallback": false,
    "sourceGroup": "parserNameOrder",
    "sourceGroupDescriptor": "()V",
    "outputOrder": [
      "artifact",
      "profile",
      "case"
    ],
    "artifacts": [
      {
        "id": "phase-parser-name-short-circuit",
        "definition": "never-define",
        "profile": {
          "className": "classes.modern_test.Phase_phase_parser_name_short_circuit",
          "major": 69,
          "minor": 0,
          "flags": 33,
          "superclass": "java.lang.Object",
          "interfaces": [],
          "fields": [],
          "methods": [],
          "attributes": [
            {
              "name": "PhaseParserNameCallback",
              "contents": []
            }
          ]
        }
      }
    ]
  },
  {
    "id": "phase-parser-name-IAE",
    "event": "parser-IAE-singleton;byte/model=equal;list=immutable;definition=never",
    "profileLine": "PROFILE|phase-parser-name-IAE|major=69|bytes=1|model=1|categories=parser-IAE-singleton",
    "categories": [
      "parser-IAE-singleton"
    ],
    "messageCount": 1,
    "messageCategories": [
      "parser-IAE-singleton"
    ],
    "initializationDebug": false,
    "parserArgumentCallback": true,
    "parserArgumentMessage": "phase-parser-held-name-IAE",
    "sourceGroup": "parserNameOrder",
    "sourceGroupDescriptor": "()V",
    "outputOrder": [
      "message",
      "artifact",
      "profile",
      "case"
    ],
    "artifacts": [
      {
        "id": "phase-parser-name-IAE",
        "definition": "never-define",
        "profile": {
          "className": "classes.modern_test.Phase_phase_parser_name_IAE",
          "major": 69,
          "minor": 0,
          "flags": 33,
          "superclass": "java.lang.Object",
          "interfaces": [],
          "fields": [],
          "methods": [],
          "attributes": [
            {
              "name": "PhaseParserNameCallback",
              "contents": []
            }
          ]
        }
      }
    ]
  }
]);
export const verifierPhaseSummary=freeze({"cases":65,"artifacts":65,"compilerRows":6});
export const verifierMessageRules=freeze([
  {
    "category": "inference",
    "exact": [
      "Inference verification is not supported"
    ]
  },
  {
    "category": "parser-constant",
    "prefixes": [
      "Bad constant value type"
    ]
  },
  {
    "category": "parser-arguments",
    "prefixes": [
      "Arguments can't fit into locals"
    ]
  },
  {
    "category": "parser-code",
    "prefixes": [
      "Code attribute in native or abstract"
    ]
  },
  {
    "category": "byte-lvt",
    "prefixes": [
      "Illegal local variable table start_pc"
    ]
  },
  {
    "category": "byte-underflow",
    "prefixes": [
      "Operand stack underflow"
    ]
  },
  {
    "category": "byte-return",
    "prefixes": [
      "Method expects a return value"
    ],
    "exact": [
      "Void return in value method"
    ]
  },
  {
    "category": "byte-discontinued",
    "prefixes": [
      "Bad instruction:",
      "Bad wide instruction"
    ]
  },
  {
    "category": "resolver-IllegalArgumentException",
    "prefixes": [
      "java.lang.IllegalArgumentException: phase-resolver-"
    ]
  },
  {
    "category": "resolver-IllegalStateException",
    "prefixes": [
      "java.lang.IllegalStateException: phase-resolver-"
    ]
  },
  {
    "category": "resolver-AssertionError",
    "prefixes": [
      "java.lang.AssertionError: phase-resolver-"
    ]
  }
]);
export const verifierCompletionFlags=freeze([
  "c7Complete",
  "c7eComplete",
  "phaseCComplete",
  "lib007Complete",
  "jvm002Complete",
  "jvm003Complete",
  "fullSourceUnitConformanceProven",
  "fullApiConformanceProven",
  "publicClassFileApiConformanceProven",
  "classFileVerifierConformanceProven",
  "classFileStackMapConformanceProven",
  "classFileHierarchyResolverConformanceProven",
  "classFileAllAttributesConformanceProven",
  "classFileAllOpcodesConformanceProven",
  "classFileAllVersionsConformanceProven",
  "classFileByteForByteNativeParityProven",
  "namedModuleRuntimeConformanceProven",
  "classFileApiSealingConformanceProven"
]);
