import type from './nominal_type_cases.mjs';
import handles from './nominal_handle_cases.mjs';
import dynamic from './nominal_dynamic_cases.mjs';
import varhandle from './nominal_varhandle_cases.mjs';

// Ordered selected C6 catalogue. The CLI wrapper independently lists every
// required group and case id; importing these modules never defines an exit.
export const nominalConstantGroups = Object.freeze([type, ...handles, dynamic, varhandle]);
export default nominalConstantGroups;
