import { config } from "../../package.json";
import { fetchModels, PROVIDERS } from "./llmApi";
import {
  getApiKeyForProvider,
  setApiKeyForProvider,
  getModel,
  getProvider,
} from "../utils/prefs";

export async function registerPrefsScripts(_window: Window) {
  if (!addon.data.prefs) {
    addon.data.prefs = {
      window: _window,
      columns: [],
      rows: [],
    };
  } else {
    addon.data.prefs.window = _window;
  }

  bindPrefEvents();

  // Load the API key for the current provider into the input
  syncApiKeyInput();

  // Auto-fetch models if API key is set (or Ollama which needs no key)
  const provider = getProvider();
  const apiKey = getApiKeyForProvider(provider);
  if (apiKey || provider === "ollama") {
    await refreshModels(_window);
  }
}

function getDoc() {
  return addon.data.prefs!.window.document;
}

function el(id: string) {
  return getDoc().querySelector(`#zotero-prefpane-${config.addonRef}-${id}`);
}

/**
 * Sync the API key input field with the current provider's stored key
 */
function syncApiKeyInput() {
  const input = el("apiKey") as HTMLInputElement | null;
  if (!input) return;
  const provider = getProvider();
  const key = getApiKeyForProvider(provider) || "";
  input.value = key;
}

function bindPrefEvents() {
  // Provider change → load that provider's key, refresh models
  el("provider")?.addEventListener("command", () => {
    ztoolkit.log("Provider changed");
    syncApiKeyInput();

    // Set default model for new provider
    const provider = getProvider();
    const menulist = el("model") as XULMenuListElement | null;
    if (menulist) {
      menulist.value = PROVIDERS[provider].defaultModel;
    }

    refreshModels(addon.data.prefs!.window);
  });

  // API key change → save to current provider's key, refresh models
  el("apiKey")?.addEventListener("change", () => {
    const input = el("apiKey") as HTMLInputElement | null;
    if (!input) return;
    const provider = getProvider();
    setApiKeyForProvider(provider, input.value.trim());
    ztoolkit.log(`API key updated for ${provider}`);
    refreshModels(addon.data.prefs!.window);
  });

  // Model select
  el("model")?.addEventListener("command", () => {
    ztoolkit.log("Model changed");
  });

  // Refresh button
  el("refresh-models")?.addEventListener("click", () => {
    refreshModels(addon.data.prefs!.window);
  });
}

async function refreshModels(win: Window): Promise<void> {
  const provider = getProvider();
  const apiKey = getApiKeyForProvider(provider);
  if (!apiKey && provider !== "ollama") {
    ztoolkit.log("No API key set, skipping model fetch");
    return;
  }

  const doc = win.document;
  const popup = doc.querySelector(
    `#zotero-prefpane-${config.addonRef}-model-popup`,
  );
  if (!popup) return;

  const currentModel = getModel();

  // Show loading state
  const btn = el("refresh-models") as HTMLButtonElement | null;
  if (btn) {
    btn.disabled = true;
    btn.textContent = "...";
  }

  try {
    const models = await fetchModels(apiKey || "", provider);
    ztoolkit.log(`Fetched ${models.length} models from ${provider}`);

    // Clear existing items
    while (popup.firstChild) {
      popup.removeChild(popup.firstChild);
    }

    // Sort models alphabetically
    const sortedModels = models
      .map((m) => m.id)
      .sort((a, b) => a.localeCompare(b));

    // Populate dropdown
    for (const modelId of sortedModels) {
      const item = doc.createXULElement("menuitem");
      item.setAttribute("label", modelId);
      item.setAttribute("value", modelId);
      popup.appendChild(item);
    }

    // Restore selection
    const menulist = el("model") as XULMenuListElement | null;
    if (menulist) {
      menulist.value = currentModel;
    }
  } catch (e) {
    ztoolkit.log(
      `Failed to fetch models: ${e instanceof Error ? e.message : e}`,
    );
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = "↻";
    }
  }
}
