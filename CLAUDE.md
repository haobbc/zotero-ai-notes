# CLAUDE.md - Project Guide for AI Assistants

## Project Overview

**Zotero AI Notes** - A Zotero 8+ plugin that generates structured AI summaries for academic papers using the Grok (xAI) API.

## Key Architecture

- **Plugin type:** Bootstrap plugin (not WebExtension)
- **Entry flow:** `bootstrap.js` → `src/index.ts` → `src/hooks.ts`
- **Build:** `zotero-plugin-scaffold` + esbuild, target Firefox 115+
- **Language:** TypeScript 5.9, Fluent (.ftl) for i18n

## Important Patterns & Gotchas

- **Menu API:** Use `Zotero.MenuManager.registerMenu()` (Zotero 8 native). The old `ztoolkit.Menu` was removed in toolkit 5.1.x.
- **Menu registration:** Must be called once in `onStartup()`, NOT per-window in `onMainWindowLoad()`.
- **Menu labels:** MenuManager `l10nID` cannot resolve plugin FTL files. Use `onShowing` + `context.menuElem.setAttribute("label", ...)` instead.
- **ProgressWindow:** `createLine()` returns `this` (chainable). Use `changeLine({ idx })` to update a specific line.
- **i18n:** Only `addon.ftl` is loaded by `initLocale()`. Put all runtime strings there. `mainWindow.ftl` and `preferences.ftl` are for XHTML `data-l10n-id` only.
- **Citation keys:** Prefer native `citationKey` / `citationkey` (`item.getField` or item JSON). Extra-field and Better BibTeX are fallbacks only. See `src/utils/citationKey.ts`.

## Config (package.json)

```
addonRef:     zoteroainotes
addonID:      zotero-ai-notes@paper-ai.local
addonInstance: ZoteroAINotes
prefsPrefix:  extensions.zotero.zoteroainotes
```

## File Roles

| File                              | Role                                               |
| --------------------------------- | -------------------------------------------------- |
| `addon/bootstrap.js`              | Zotero lifecycle entry (install/startup/shutdown)  |
| `src/index.ts`                    | Create Addon instance, mount globals               |
| `src/hooks.ts`                    | Lifecycle dispatcher (startup → init, prefs, menu) |
| `src/modules/menu.ts`             | Right-click menu + processing coordinator          |
| `src/modules/pdfExtract.ts`       | PDF text extraction (4 fallback methods)           |
| `src/modules/grokApi.ts`          | Grok API HTTP calls + model listing                |
| `src/modules/prompts.ts`          | LLM prompt templates + HTML formatting             |
| `src/modules/noteCreator.ts`      | Zotero note CRUD with auto-generated tags          |
| `src/modules/preferenceScript.ts` | Prefs pane: dynamic model dropdown                 |
| `src/utils/citationKey.ts`        | Native citationKey lookup + Extra/BBT fallbacks    |
| `src/utils/locale.ts`             | FTL translation loader (addon.ftl only)            |
| `src/utils/prefs.ts`              | Preference read/write helpers                      |

## Build & Dev

```bash
npm start          # Dev server with hot reload (needs .env)
npm run build      # Production build → .scaffold/build/*.xpi
npm run lint:fix   # Prettier + ESLint
npm test           # Run tests in Zotero
```

## Dependencies

- `zotero-plugin-toolkit` ^5.1.2
- `zotero-types` ^4.1.2
- `zotero-plugin-scaffold` ^0.8.3
- `eslint` ^10.0.3
