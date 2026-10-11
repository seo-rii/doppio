import * as harness from './java_methodhandle_core_test.mjs';
import {registerMethodHandleContractTests} from './java_methodhandle_contract_suite.mjs';

registerMethodHandleContractTests(harness, {phaseId: 'C1', caseCount: 60, groupCount: 4,
  harnessFilename: 'java_methodhandle_core_test.mjs', contractFilename: 'java_methodhandle_core_contract_test.mjs',
  ledgerBase: 'java-methodhandle-core'});
