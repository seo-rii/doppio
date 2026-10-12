import model from './classfile_model_cases.mjs';
import build from './classfile_build_cases.mjs';
import transform from './classfile_transform_cases.mjs';
import verify from './classfile_verify_cases.mjs';

// Selected public Java25 C7a pipeline, not full C7 or LIB-007 conformance.
// The wrapper independently binds all four groups and all32 literal case ids.
export const classfileApiGroups = Object.freeze([model, build, transform, verify]);
export default classfileApiGroups;
