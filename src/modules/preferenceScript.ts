import { config } from "../../package.json";

export async function registerPrefsScripts(_window: Window) {
  // This function is called when the prefs window is opened
  // See addon/content/preferences.xhtml onpaneload
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
}

function bindPrefEvents() {
  // Bind API key input
  addon.data.prefs!.window.document
    ?.querySelector(`#zotero-prefpane-${config.addonRef}-apiKey`)
    ?.addEventListener("change", (e: Event) => {
      ztoolkit.log("API key changed");
    });

  // Bind model select
  addon.data.prefs!.window.document
    ?.querySelector(`#zotero-prefpane-${config.addonRef}-model`)
    ?.addEventListener("command", (e: Event) => {
      ztoolkit.log("Model changed");
    });
}
