import { config } from "../../package.json";
import { ProviderId, PROVIDERS } from "../modules/llmApi";

type PluginPrefsMap = _ZoteroTypes.Prefs["PluginPrefsMap"];

const PREFS_PREFIX = config.prefsPrefix;

/**
 * Get preference value.
 */
export function getPref<K extends keyof PluginPrefsMap>(key: K) {
  return Zotero.Prefs.get(`${PREFS_PREFIX}.${key}`, true) as PluginPrefsMap[K];
}

/**
 * Set preference value.
 */
export function setPref<K extends keyof PluginPrefsMap>(
  key: K,
  value: PluginPrefsMap[K],
) {
  return Zotero.Prefs.set(`${PREFS_PREFIX}.${key}`, value, true);
}

/**
 * Clear preference value.
 */
export function clearPref(key: string) {
  return Zotero.Prefs.clear(`${PREFS_PREFIX}.${key}`, true);
}

/**
 * Get the selected provider
 */
export function getProvider(): ProviderId {
  try {
    const value = getPref("provider" as keyof PluginPrefsMap) as
      | string
      | undefined;
    if (value && value in PROVIDERS) {
      return value as ProviderId;
    }
    return "grok";
  } catch {
    return "grok";
  }
}

/**
 * Get the API key for a specific provider
 */
export function getApiKeyForProvider(provider: ProviderId): string | null {
  const keyMap: Record<ProviderId, keyof PluginPrefsMap> = {
    grok: "apiKeyGrok" as keyof PluginPrefsMap,
    openai: "apiKeyOpenai" as keyof PluginPrefsMap,
    anthropic: "apiKeyAnthropic" as keyof PluginPrefsMap,
    gemini: "apiKeyGemini" as keyof PluginPrefsMap,
    ollama: "apiKeyOllama" as keyof PluginPrefsMap,
  };
  try {
    const value = getPref(keyMap[provider]) as string | undefined;
    return value && value.trim().length > 0 ? value.trim() : null;
  } catch {
    return null;
  }
}

/**
 * Get the API key for the currently selected provider.
 * Ollama doesn't require an API key, returns empty string.
 */
export function getApiKey(): string | null {
  const provider = getProvider();
  if (provider === "ollama") {
    return "";
  }
  return getApiKeyForProvider(provider);
}

/**
 * Set the API key for a specific provider
 */
export function setApiKeyForProvider(
  provider: ProviderId,
  apiKey: string,
): void {
  const keyMap: Record<ProviderId, keyof PluginPrefsMap> = {
    grok: "apiKeyGrok" as keyof PluginPrefsMap,
    openai: "apiKeyOpenai" as keyof PluginPrefsMap,
    anthropic: "apiKeyAnthropic" as keyof PluginPrefsMap,
    gemini: "apiKeyGemini" as keyof PluginPrefsMap,
    ollama: "apiKeyOllama" as keyof PluginPrefsMap,
  };
  try {
    setPref(keyMap[provider], apiKey as never);
  } catch (e) {
    ztoolkit.log(`Error setting API key: ${e}`);
  }
}

/**
 * Get the selected model
 */
export function getModel(): string {
  try {
    const value = getPref("model" as keyof PluginPrefsMap) as
      | string
      | undefined;
    if (value && value.trim().length > 0) {
      return value.trim();
    }
    return PROVIDERS[getProvider()].defaultModel;
  } catch {
    return PROVIDERS[getProvider()].defaultModel;
  }
}

/**
 * Set the model
 */
export function setModel(model: string): void {
  try {
    setPref("model" as keyof PluginPrefsMap, model as never);
  } catch (e) {
    ztoolkit.log(`Error setting model: ${e}`);
  }
}
