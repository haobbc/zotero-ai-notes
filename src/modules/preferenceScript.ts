import { config } from "../../package.json";
import { fetchModels } from "./grokApi";
import { getApiKey, getModel } from "../utils/prefs";

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

  // Auto-fetch models if API key is set
  const apiKey = getApiKey();
  if (apiKey) {
    await refreshModels(_window);
  }
}

function bindPrefEvents() {
  const doc = addon.data.prefs!.window.document;

  // Bind API key input - refresh models when key changes
  doc
    ?.querySelector(`#zotero-prefpane-${config.addonRef}-apiKey`)
    ?.addEventListener("change", () => {
      ztoolkit.log("API key changed");
      refreshModels(addon.data.prefs!.window);
    });

  // Bind model select
  doc
    ?.querySelector(`#zotero-prefpane-${config.addonRef}-model`)
    ?.addEventListener("command", () => {
      ztoolkit.log("Model changed");
    });

  // Bind refresh button
  doc
    ?.querySelector(`#zotero-prefpane-${config.addonRef}-refresh-models`)
    ?.addEventListener("click", () => {
      refreshModels(addon.data.prefs!.window);
    });
}

async function refreshModels(win: Window): Promise<void> {
  const apiKey = getApiKey();
  if (!apiKey) {
    ztoolkit.log("No API key set, skipping model fetch");
    return;
  }

  const doc = win.document;
  const popup = doc.querySelector(
    `#zotero-prefpane-${config.addonRef}-model-popup`,
  );
  if (!popup) return;

  const currentModel = getModel();

  // Show loading state on button
  const btn = doc.querySelector(
    `#zotero-prefpane-${config.addonRef}-refresh-models`,
  ) as HTMLButtonElement | null;
  if (btn) {
    btn.disabled = true;
    btn.textContent = "...";
  }

  try {
    const models = await fetchModels(apiKey);
    ztoolkit.log(`Fetched ${models.length} models`);

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
    const menulist = doc.querySelector(
      `#zotero-prefpane-${config.addonRef}-model`,
    ) as XULMenuListElement | null;
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
