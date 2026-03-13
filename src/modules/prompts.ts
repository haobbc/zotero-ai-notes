/**
 * Prompt templates for AI summary generation
 * Ported from Python paper-ai project
 */

/**
 * Main summary generation prompt
 * Instructs the LLM to generate a structured academic paper summary
 */
export const SUMMARY_PROMPT = `你是一位頂尖的學術研究員，專精於 [神經外科,腦瘤,影像分割,機器學習]。請以繁體中文，為我深入且精要地分析以下論文，並提供以下資訊：

研究目的 (Purpose): 清晰地闘述這篇論文試圖解決的核心問題或達成的研究目標。
方法 (Methodology): 詳細說明作者使用的主要技術、實驗設計、數據集和評估指標。請條列式說明。
核心貢獻 (Key Contributions): 條列式總結本文最重要、最具創新性的貢獻。
實驗結果 (Results): 總結論文的關鍵實驗數據和發現。是否有任何出乎意料的結果？
優點與侷限 (Strengths & Limitations): 客觀分析這篇論文的優點和潛在的侷限性或未來可以改進的方向。

請以 JSON 格式回應，包含以下欄位：
- purpose: 研究目的
- methodology: 方法（條列式）
- key_contributions: 核心貢獻（條列式）
- results: 實驗結果
- strengths_limitations: 優點與侷限

---
論文內容如下：
{text}`;

/**
 * System message for the LLM
 */
export const SYSTEM_MESSAGE =
  "You are a professional academic writer. Please provide the summary in the specified JSON format.";

/**
 * Structured paper summary interface
 * Matches the Python PaperSummary Pydantic model
 * Note: LLM may return arrays instead of strings for list fields
 */
export interface PaperSummary {
  purpose: string | string[];
  methodology: string | string[];
  key_contributions: string | string[];
  results: string | string[];
  strengths_limitations: string | string[];
}

/**
 * Format a PaperSummary into HTML for Zotero notes
 */
export function formatSummaryAsHtml(
  summary: PaperSummary,
  title: string,
  citationKey: string,
  sourceType: "pdf" | "abstract",
): string {
  return `
<h1>${escapeHtml(title)}</h1>

<h2>Metadata</h2>
<ul>
  <li><strong>Citation Key</strong>: ${escapeHtml(citationKey)}</li>
  <li><strong>Source</strong>: ${sourceType.toUpperCase()}</li>
</ul>

<h2>Purpose</h2>
${formatAsHtmlList(summary.purpose)}

<h2>Methodology</h2>
${formatAsHtmlList(summary.methodology)}

<h2>Key Contributions</h2>
${formatAsHtmlList(summary.key_contributions)}

<h2>Results</h2>
${formatAsHtmlList(summary.results)}

<h2>Strengths & Limitations</h2>
${formatAsHtmlList(summary.strengths_limitations)}
`.trim();
}

/**
 * Format text or array with line breaks as HTML list
 */
function formatAsHtmlList(text: string | string[]): string {
  // Handle array input (LLM sometimes returns arrays)
  if (Array.isArray(text)) {
    if (text.length === 0) {
      return "<p></p>";
    }
    if (text.length === 1) {
      return `<p>${escapeHtml(String(text[0]))}</p>`;
    }
    const items = text
      .map((item) => `<li>${escapeHtml(String(item))}</li>`)
      .join("\n");
    return `<ul>\n${items}\n</ul>`;
  }

  // Handle string input
  const textStr = String(text || "");
  const lines = textStr.split(/\n|;/).filter((line) => line.trim());

  if (lines.length <= 1) {
    return `<p>${escapeHtml(textStr)}</p>`;
  }

  const items = lines
    .map((line) => {
      // Remove bullet points and numbers at the start
      const cleaned = line.replace(/^[\s\-\*\d\.]+/, "").trim();
      return `<li>${escapeHtml(cleaned)}</li>`;
    })
    .join("\n");

  return `<ul>\n${items}\n</ul>`;
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
