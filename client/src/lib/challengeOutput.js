// Re-export from shared canonical copy to avoid duplication.
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
