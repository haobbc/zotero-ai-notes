import { config } from "../../package.json";

type PluginPrefsMap = _ZoteroTypes.Prefs["PluginPrefsMap"];

const PREFS_PREFIX = config.prefsPrefix;

// Default values
const DEFAULT_MODEL = "grok-4";

/**
 * Get preference value.
 * Wrapper of `Zotero.Prefs.get`.
 * @param key
 */
export function getPref<K extends keyof PluginPrefsMap>(key: K) {
  return Zotero.Prefs.get(`${PREFS_PREFIX}.${key}`, true) as PluginPrefsMap[K];
}

/**
 * Set preference value.
 * Wrapper of `Zotero.Prefs.set`.
 * @param key
 * @param value
 */
export function setPref<K extends keyof PluginPrefsMap>(
  key: K,
  value: PluginPrefsMap[K],
) {
  return Zotero.Prefs.set(`${PREFS_PREFIX}.${key}`, value, true);
}

/**
 * Clear preference value.
 * Wrapper of `Zotero.Prefs.clear`.
 * @param key
 */
export function clearPref(key: string) {
  return Zotero.Prefs.clear(`${PREFS_PREFIX}.${key}`, true);
}

/**
 * Get the stored Grok API key
 *
 * @returns API key or null if not set
 */
export function getApiKey(): string | null {
  try {
    const value = getPref("apiKey" as keyof PluginPrefsMap) as
      | string
      | undefined;
    return value && value.trim().length > 0 ? value.trim() : null;
  } catch (e) {
    ztoolkit.log(`Error getting API key: ${e}`);
    return null;
  }
}

/**
 * Set the Grok API key
 *
 * @param apiKey - API key to store
 */
export function setApiKey(apiKey: string): void {
  try {
    setPref("apiKey" as keyof PluginPrefsMap, apiKey as never);
  } catch (e) {
    ztoolkit.log(`Error setting API key: ${e}`);
  }
}

/**
 * Get the selected model
 *
 * @returns Model name
 */
export function getModel(): string {
  try {
    const value = getPref("model" as keyof PluginPrefsMap) as
      | string
      | undefined;
    return value && value.trim().length > 0 ? value.trim() : DEFAULT_MODEL;
  } catch (e) {
    ztoolkit.log(`Error getting model: ${e}`);
    return DEFAULT_MODEL;
  }
}

/**
 * Set the model
 *
 * @param model - Model name to store
 */
export function setModel(model: string): void {
  try {
    setPref("model" as keyof PluginPrefsMap, model as never);
  } catch (e) {
    ztoolkit.log(`Error setting model: ${e}`);
  }
}
