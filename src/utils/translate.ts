import type { Translation, TranslationPayload } from "../types/translation";

/**
 * Resolve the user-facing content for a piece of data.
 *
 * Pure and dependency-free (no i18n or external modules): given the original
 * `source` and an optional stored `translation` already fetched for the desired
 * language, it returns the translated content, gracefully falling back to
 * `source` whenever a translation is missing or incomplete.
 *
 * Nested objects and arrays are merged recursively so only translated string
 * leaves are overlaid; structure and non-text values stay intact.
 *
 * Intended for use right where data is echoed to the user, e.g. in JSX:
 *
 * ```tsx
 * // whole payload
 * const t = translate(task, translation);
 * <h1>{t.title}</h1>
 *
 * // single field
 * <h1>{translate(task, translation, "title")}</h1>
 * ```
 */
export function translate<T extends TranslationPayload>(
  source: T,
  translation?: Translation | null,
): T;
export function translate(
  source: TranslationPayload,
  translation: Translation | null | undefined,
  field: string,
): unknown;
export function translate(
  source: TranslationPayload,
  translation?: Translation | null,
  field?: string,
): TranslationPayload | unknown {
  const translated = extractTranslated(translation);

  if (field !== undefined) {
    const value = translated?.[field];
    if (value === undefined || value === null) return source[field];
    return mergeTranslation(source[field], value);
  }

  if (!translated) return source;

  return mergeTranslation(source, translated) as TranslationPayload;
}

/**
 * Recursively overlay ``translated`` onto ``source``, preserving source shape.
 *
 * - objects: recurse on source keys; keep source when a key is missing
 * - arrays: zip-merge by index up to ``source.length``
 * - strings: prefer translated when it is also a string
 * - everything else: keep source
 */
export function mergeTranslation(source: unknown, translated: unknown): unknown {
  if (isRecord(source)) {
    if (!isRecord(translated)) return source;
    const result: TranslationPayload = { ...source };
    for (const key of Object.keys(source)) {
      result[key] = mergeTranslation(source[key], translated[key]);
    }
    return result;
  }

  if (Array.isArray(source)) {
    if (!Array.isArray(translated)) return source;
    return source.map((item, index) =>
      mergeTranslation(item, index < translated.length ? translated[index] : undefined),
    );
  }

  if (typeof source === "string") {
    return typeof translated === "string" ? translated : source;
  }

  return source;
}

/**
 * Pull the translated payload out of a stored translation.
 *
 * Handles the backend provider wrapper (`{ source_lang, target_lang, provider,
 * translated }`) and also tolerates a translation whose `data` already is the
 * translated content.
 */
function extractTranslated(
  translation?: Translation | null,
): TranslationPayload | undefined {
  const data = translation?.data;

  if (!isRecord(data)) return undefined;

  if ("translated" in data) {
    return isRecord(data.translated) ? data.translated : undefined;
  }

  return data;
}

function isRecord(value: unknown): value is TranslationPayload {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
