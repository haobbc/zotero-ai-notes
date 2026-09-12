/**
 * Citation-key resolution for Zotero items.
 *
 * Prefers the native citationKey field added in Zotero 8 and exposed on
 * additional API surfaces in Zotero 10 (getField / item JSON). Falls back
 * to Extra-field and Better BibTeX keys when the native field is missing.
 */

const NATIVE_FIELD_NAMES = ["citationKey", "citationkey"] as const;

/**
 * Legacy Better BibTeX / Extra-field citekey lines, e.g.
 * "Citation Key: smith2020" or "tex.citationkey: smith2020".
 */
const EXTRA_CITEKEY_RE =
  /^\s*(?:citation[\s_-]*key|tex\.citationkey)\s*:\s*(\S+)/im;

function log(message: string): void {
  try {
    ztoolkit.log(message);
  } catch {
    // ztoolkit may be unavailable in isolated unit tests
  }
}

/**
 * Treat only non-empty strings as usable citation keys.
 */
export function normalizeCitationKey(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Parse a citation key from an Extra field blob.
 */
export function parseCitationKeyFromExtra(extra: unknown): string | null {
  if (typeof extra !== "string" || extra.trim().length === 0) {
    return null;
  }
  const match = extra.match(EXTRA_CITEKEY_RE);
  return match ? normalizeCitationKey(match[1]) : null;
}

function readItemField(item: Zotero.Item, field: string): unknown {
  try {
    return item.getField(field);
  } catch {
    // Field may be invalid for this item type or Zotero version
    return undefined;
  }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  return value as Record<string, unknown>;
}

function readNativeCitationKey(item: Zotero.Item): string | null {
  for (const field of NATIVE_FIELD_NAMES) {
    const value = normalizeCitationKey(readItemField(item, field));
    if (value) {
      log(`Got native citation key (${field}): ${value}`);
      return value;
    }
  }

  try {
    const toJSON = (item as { toJSON?: () => unknown }).toJSON;
    if (typeof toJSON !== "function") {
      return null;
    }
    const json = asRecord(toJSON.call(item));
    if (!json) {
      return null;
    }
    const data = asRecord(json.data) ?? json;
    for (const field of NATIVE_FIELD_NAMES) {
      const value = normalizeCitationKey(data[field]);
      if (value) {
        log(`Got citation key from item JSON (${field}): ${value}`);
        return value;
      }
    }
  } catch {
    // toJSON is unavailable or threw
  }

  return null;
}

function readExtraCitationKey(item: Zotero.Item): string | null {
  try {
    if (typeof item.getExtraField === "function") {
      for (const field of NATIVE_FIELD_NAMES) {
        const value = normalizeCitationKey(item.getExtraField(field));
        if (value) {
          return value;
        }
      }
    }
  } catch {
    // getExtraField may be missing on older Zotero
  }
  return parseCitationKeyFromExtra(readItemField(item, "extra"));
}

function readBetterBibTeXCitationKey(item: Zotero.Item): string | null {
  try {
    const zoteroAny = Zotero as typeof Zotero & {
      BetterBibTeX?: {
        KeyManager?: {
          get?: (itemID: number) => {
            citationKey?: unknown;
            citationkey?: unknown;
            citekey?: unknown;
          };
        };
      };
    };
    const result = zoteroAny.BetterBibTeX?.KeyManager?.get?.(item.id);
    const value = normalizeCitationKey(
      result?.citationKey ?? result?.citationkey ?? result?.citekey,
    );
    if (value) {
      log(`Got citation key from BBT: ${value}`);
      return value;
    }
  } catch (e) {
    log(`Better BibTeX citation key lookup failed: ${e}`);
  }
  return null;
}

/**
 * Get a citation key from a Zotero item.
 *
 * Resolution order:
 * 1. Native citationKey / citationkey (Zotero 8+/10 API)
 * 2. Serialized item JSON (local / web API shape)
 * 3. Extra-field "Citation Key:" line (older Zotero / unmigrated BBT)
 * 4. Better BibTeX KeyManager
 * 5. Zotero item key
 */
export function getCitationKey(item: Zotero.Item): string {
  try {
    const nativeKey = readNativeCitationKey(item);
    if (nativeKey) {
      return nativeKey;
    }

    const extraKey = readExtraCitationKey(item);
    if (extraKey) {
      log(`Got citation key from Extra: ${extraKey}`);
      return extraKey;
    }

    const bbtKey = readBetterBibTeXCitationKey(item);
    if (bbtKey) {
      return bbtKey;
    }

    log(`Using Zotero item key as fallback: ${item.key}`);
    return item.key;
  } catch (e) {
    log(`Error getting citation key: ${e}`);
    return item.key;
  }
}
