import signatures from './classfile_declarations_signatures_cases.mjs';
import types from './classfile_declarations_type_annotations_cases.mjs';
import metadata from './classfile_declarations_metadata_cases.mjs';
import combinators from './classfile_declarations_combinators_cases.mjs';
import {freeze} from './classfile_declarations_case_helpers.mjs';
export const classfileDeclarationsGroups=freeze([signatures,types,metadata,combinators]);
export default classfileDeclarationsGroups;
