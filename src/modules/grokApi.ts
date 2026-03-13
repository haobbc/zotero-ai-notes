/**
 * Grok API client for generating paper summaries
 */

import { SUMMARY_PROMPT, SYSTEM_MESSAGE, PaperSummary } from "./prompts";

const GROK_API_URL = "https://api.x.ai/v1/chat/completions";

/**
 * API response type
 */
interface GrokResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * Generate a paper summary using Grok API
 *
 * @param text - The paper content (PDF text or abstract)
 * @param apiKey - Grok API key
 * @param model - Model to use (default: grok-4)
 * @returns Structured paper summary
 */
export async function generateSummary(
  text: string,
  apiKey: string,
  model: string = "grok-4",
): Promise<PaperSummary> {
  // Truncate text if too long (max ~100k chars for safety)
  const truncatedText = text.slice(0, 100000);

  // Build the prompt
  const prompt = SUMMARY_PROMPT.replace("{text}", truncatedText);

  ztoolkit.log(`Calling Grok API with model: ${model}`);
  ztoolkit.log(`Text length: ${truncatedText.length} characters`);

  const response = await fetch(GROK_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: SYSTEM_MESSAGE },
        { role: "user", content: prompt },
      ],
      temperature: 0.2,
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    ztoolkit.log(`API error: ${response.status} - ${errorText}`);
    throw new Error(
      `API request failed: ${response.status} ${response.statusText}`,
    );
  }

  const data = (await response.json()) as unknown as GrokResponse;

  if (!data.choices || data.choices.length === 0) {
    throw new Error("No response from API");
  }

  const content = data.choices[0].message.content;

  // Log token usage
  if (data.usage) {
    ztoolkit.log(
      `Token usage - Prompt: ${data.usage.prompt_tokens}, Completion: ${data.usage.completion_tokens}, Total: ${data.usage.total_tokens}`,
    );
  }

  // Parse JSON response
  try {
    const summary = JSON.parse(content) as PaperSummary;

    // Validate required fields
    if (
      !summary.purpose ||
      !summary.methodology ||
      !summary.key_contributions ||
      !summary.results ||
      !summary.strengths_limitations
    ) {
      throw new Error("Missing required fields in response");
    }

    return summary;
  } catch (e) {
    ztoolkit.log(`Failed to parse response: ${content}`);
    throw new Error(
      `Failed to parse API response: ${e instanceof Error ? e.message : "Unknown error"}`,
    );
  }
}

/**
 * Test Grok API connection
 *
 * @param apiKey - Grok API key
 * @returns True if connection is successful
 */
export async function testGrokConnection(apiKey: string): Promise<boolean> {
  const response = await fetch(GROK_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "grok-4-fast-non-reasoning",
      messages: [{ role: "user", content: "Hello" }],
      max_tokens: 5,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Connection failed: ${response.status} - ${errorText}`);
  }

  return true;
}
