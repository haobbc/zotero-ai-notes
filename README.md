# Zotero AI Notes

[![zotero target version](https://img.shields.io/badge/Zotero-8%2B%20%2F%2010-green?style=flat-square&logo=zotero&logoColor=CC2936)](https://www.zotero.org)
[![Using Zotero Plugin Template](https://img.shields.io/badge/Using-Zotero%20Plugin%20Template-blue?style=flat-square&logo=github)](https://github.com/windingwind/zotero-plugin-template)
[![License: AGPL v3](https://img.shields.io/badge/License-AGPL%20v3-blue.svg?style=flat-square)](https://www.gnu.org/licenses/agpl-3.0)

Generate AI-powered structured summaries for academic papers in Zotero using the [Grok API](https://docs.x.ai/api) (by xAI).

## Features

- **AI Paper Summaries** - Right-click any paper to generate a structured summary including research purpose, methodology, key contributions, results, and strengths/limitations
- **PDF Text Extraction** - Automatically extracts text from PDF attachments (first 20 pages) with multiple fallback methods
- **Abstract Fallback** - If no PDF is available, uses the paper's abstract
- **Batch Processing** - Select multiple papers and generate summaries for all at once
- **Smart Deduplication** - Skips papers that already have PDF-based summaries
- **Dynamic Model Selection** - Fetches available models from the Grok API in preferences
- **Native Citation Keys** - Uses Zotero 10/8's built-in `citationKey` field (also accepts `citationkey`), then Extra-field and Better BibTeX fallbacks
- **Bilingual** - English and Traditional Chinese (zh-TW) localization

## Installation

1. Download the latest `.xpi` file from [Releases](https://github.com/haobbc/zotero-ai-notes/releases)
2. In Zotero: Tools → Add-ons → Install Add-on From File → select the `.xpi`
3. Restart Zotero

## Setup

1. Get a Grok API key from [xAI Console](https://console.x.ai/)
2. In Zotero: Edit → Settings → Zotero AI Notes
3. Enter your API key
4. Select a model (click the refresh button to load available models)

## Usage

1. Select one or more papers in your Zotero library
2. Right-click → **Generate AI Summary**
3. Wait for processing - a progress window shows status for each item
4. The summary is created as a child note with structured sections

### Generated Summary Structure

Each summary note includes:

- **Research Purpose** (研究目的)
- **Methodology** (研究方法)
- **Key Contributions** (主要貢獻)
- **Experimental Results** (實驗結果)
- **Strengths & Limitations** (優缺點)

Notes are tagged with `auto-generated` and `source:pdf` or `source:abstract`.

## Requirements

- **Zotero 8+** (compatible through Zotero 10; uses the native `citationKey` field when present)
- **Grok API key** from [xAI](https://console.x.ai/)

## Development

### Prerequisites

- [Node.js](https://nodejs.org/) (LTS)
- [Zotero 8](https://www.zotero.org/)

### Setup

```bash
git clone https://github.com/haobbc/zotero-ai-notes.git
cd zotero-ai-notes
npm install
cp .env.example .env
# Edit .env with your Zotero binary and profile paths
```

### Dev Mode

```bash
npm start    # Start Zotero with hot reload
```

### Build

```bash
npm run build    # Build .xpi to .scaffold/build/
```

### Project Structure

```
src/
├── index.ts                  # Entry point
├── addon.ts                  # Addon class
├── hooks.ts                  # Lifecycle hooks
├── modules/
│   ├── menu.ts               # Context menu + processing
│   ├── grokApi.ts            # Grok API client
│   ├── pdfExtract.ts         # PDF text extraction
│   ├── prompts.ts            # LLM prompts + HTML formatting
│   ├── noteCreator.ts        # Zotero note CRUD
│   └── preferenceScript.ts   # Preferences UI
└── utils/
    ├── locale.ts             # i18n helpers
    ├── prefs.ts              # Preference helpers
    ├── ztoolkit.ts           # ZoteroToolkit init
    └── window.ts             # Window utilities
```

## License

[AGPL-3.0-or-later](LICENSE)
