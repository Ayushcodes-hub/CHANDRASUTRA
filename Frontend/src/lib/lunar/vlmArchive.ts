/* Shared per-site VLM report archive — the single source of truth for the
   `lunarmatch:vlm` localStorage key. Both the VLM analysis panel (writer)
   and the site register (reader — LAST REPORT chips) import from here so
   the register can react to newly filed reports via a window event. */

import { VlmAnalysisResult } from './types';

export interface VlmArchiveEntry {
  result: VlmAnalysisResult;
  /** Wall-clock time the report was produced (HH:MM:SS). */
  time: string;
  /** Previously filed reports for this site, newest first (cap 2) —
      enables the current-vs-previous diff view. */
  history?: { result: VlmAnalysisResult; time: string }[];
}

export type VlmArchive = Record<string, VlmArchiveEntry>;

export const VLM_ARCHIVE_KEY = 'lunarmatch:vlm';

/* Fired on window after every successful save so same-page readers
   (site register chips) refresh without polling. */
export const VLM_ARCHIVE_EVENT = 'lunarmatch:vlm-changed';

export const loadVlmArchive = (): VlmArchive => {
  try {
    const raw = JSON.parse(localStorage.getItem(VLM_ARCHIVE_KEY) ?? '{}') as VlmArchive;
    // Guard: keep only well-formed entries with a successful report
    const clean: VlmArchive = {};
    for (const [site, entry] of Object.entries(raw)) {
      if (
        entry &&
        typeof site === 'string' &&
        entry.result &&
        entry.result.status === 'success' &&
        typeof entry.result.confidence === 'number' &&
        typeof entry.time === 'string'
      ) {
        clean[site] = {
          result: entry.result,
          time: entry.time,
          // History: previous reports, newest first — keep valid ones only
          history: Array.isArray(entry.history)
            ? entry.history
                .filter(
                  (h) =>
                    h &&
                    h.result &&
                    h.result.status === 'success' &&
                    typeof h.result.confidence === 'number' &&
                    typeof h.time === 'string'
                )
                .slice(0, 2)
            : [],
        };
      }
    }
    return clean;
  } catch {
    return {};
  }
};

export const saveVlmArchive = (archive: VlmArchive) => {
  try {
    if (Object.keys(archive).length) {
      localStorage.setItem(VLM_ARCHIVE_KEY, JSON.stringify(archive));
    } else {
      localStorage.removeItem(VLM_ARCHIVE_KEY);
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(VLM_ARCHIVE_EVENT));
    }
  } catch {
    // Storage full/unavailable — archive continues in-memory only
  }
};
