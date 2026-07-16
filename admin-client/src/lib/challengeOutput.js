// Re-export from shared canonical copy — ensures admin reviewers and participants
// use identical output-comparison logic (including float tolerance, order-independence, etc.)
export {
  LANG_LITERALS,
  decodeHtmlEntities,
  normalizeOutput,
  displayExpected,
  tryParseJson,
  floatsClose,
  deepEqualWithTolerance,
  canonicalize,
  outputsMatch,
  formatArgForStdin,
  argsToStdin,
  b64Encode,
  b64Decode,
  defaultStarterByLanguage,
  computeExecStats,
  formatExecStats,
} from '../../../shared/lib/challengeOutput';
