import model from './classfile_debug_model_cases.mjs';
import remap from './classfile_debug_remap_cases.mjs';
import lifecycle from './classfile_debug_lifecycle_cases.mjs';
import {freeze} from './classfile_debug_case_helpers.mjs';
export const classfileDebugGroups=freeze([model,remap,lifecycle]);
export default classfileDebugGroups;

