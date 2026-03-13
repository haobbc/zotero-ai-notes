/**
 * Unified LLM API client supporting multiple providers
 */

import { SUMMARY_PROMPT, SYSTEM_MESSAGE, PaperSummary } from "./prompts";

// Provider types
export type ProviderId = "grok" | "openai" | "anthropic" | "gemini" | "ollama";

export interface ProviderConfig {
  name: string;
  baseUrl: string;
  defaultModel: string;
}

export const PROVIDERS: Record<ProviderId, ProviderConfig> = {
  grok: {
    name: "Grok (xAI)",
    baseUrl: "https://api.x.ai/v1",
    defaultModel: "grok-4",
  },
  openai: {
    name: "OpenAI",
    baseUrl: "https://api.openai.com/v1",
    defaultModel: "gpt-4o",
  },
  anthropic: {
    name: "Anthropic (Claude)",
    baseUrl: "https://api.anthropic.com/v1",
    defaultModel: "claude-sonnet-4-6",
  },
  gemini: {
    name: "Gemini (Google)",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
    defaultModel: "gemini-2.5-flash",
  },
  ollama: {
    name: "Ollama (Local)",
    baseUrl: "http://localhost:11434/v1",
    defaultModel: "llama3.2",
  },
};

export const PROVIDER_IDS = Object.keys(PROVIDERS) as ProviderId[];

export interface ModelInfo {
  id: string;
  owned_by?: string;
}

// OpenAI-compatible response
interface OpenAIResponse {
  choices: Array<{
    message: { content: string };
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

// Anthropic Messages API response
interface AnthropicResponse {
  content: Array<{
    type: string;
    text: string;
  }>;
  usage?: {
    input_tokens: number;
    output_tokens: number;
  };
}

/**
 * Generate a paper summary using the selected provider
 */
export async function generateSummary(
  text: string,
  apiKey: string,
  model: string,
  provider: ProviderId = "grok",
): Promise<PaperSummary> {
  // Ollama local models have smaller context windows
  const maxChars = provider === "ollama" ? 30000 : 100000;
  const truncatedText = text.slice(0, maxChars);
  const prompt = SUMMARY_PROMPT.replace("{text}", truncatedText);

  ztoolkit.log(`Calling ${provider} API with model: ${model}`);
  ztoolkit.log(`Text length: ${truncatedText.length} characters`);

  let content: string;
  let usage: string | undefined;

  if (provider === "anthropic") {
    const result = await callAnthropic(apiKey, model, prompt);
    content = result.content;
    usage = result.usage;
  } else if (provider === "ollama") {
    const result = await callOllama(model, prompt);
    content = result.content;
    usage = result.usage;
  } else {
    const result = await callOpenAICompatible(
      PROVIDERS[provider].baseUrl,
      apiKey,
      model,
      prompt,
    );
    content = result.content;
    usage = result.usage;
  }

  if (usage) {
    ztoolkit.log(`Token usage - ${usage}`);
  }

  // Parse JSON response
  try {
    const summary = JSON.parse(content) as PaperSummary;

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
      { cause: e },
    );
  }
}

/**
 * Call OpenAI-compatible API (Grok, OpenAI, Gemini, Ollama)
 */
async function callOpenAICompatible(
  baseUrl: string,
  apiKey: string,
  model: string,
  prompt: string,
): Promise<{ content: string; usage?: string }> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (apiKey) {
    headers["Authorization"] = `Bearer ${apiKey}`;
  }

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers,
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

  const data = (await response.json()) as unknown as OpenAIResponse;

  if (!data.choices || data.choices.length === 0) {
    throw new Error("No response from API");
  }

  return {
    content: data.choices[0].message.content,
    usage: data.usage
      ? `Prompt: ${data.usage.prompt_tokens}, Completion: ${data.usage.completion_tokens}, Total: ${data.usage.total_tokens}`
      : undefined,
  };
}

/**
 * Call Anthropic Messages API
 */
async function callAnthropic(
  apiKey: string,
  model: string,
  prompt: string,
): Promise<{ content: string; usage?: string }> {
  const response = await fetch(`${PROVIDERS.anthropic.baseUrl}/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: 4096,
      system: SYSTEM_MESSAGE,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    ztoolkit.log(`Anthropic API error: ${response.status} - ${errorText}`);
    throw new Error(
      `API request failed: ${response.status} ${response.statusText}`,
    );
  }

  const data = (await response.json()) as unknown as AnthropicResponse;

  if (!data.content || data.content.length === 0) {
    throw new Error("No response from Anthropic API");
  }

  const textBlock = data.content.find((b) => b.type === "text");
  if (!textBlock) {
    throw new Error("No text content in Anthropic response");
  }

  return {
    content: textBlock.text,
    usage: data.usage
      ? `Input: ${data.usage.input_tokens}, Output: ${data.usage.output_tokens}`
      : undefined,
  };
}

/**
 * Call Ollama native API (supports num_ctx for context window)
 */
async function callOllama(
  model: string,
  prompt: string,
): Promise<{ content: string; usage?: string }> {
  // Structured output schema — forces the model to return the correct fields
  const outputSchema = {
    type: "object",
    properties: {
      purpose: { type: "string" },
      methodology: { type: "string" },
      key_contributions: { type: "string" },
      results: { type: "string" },
      strengths_limitations: { type: "string" },
    },
    required: [
      "purpose",
      "methodology",
      "key_contributions",
      "results",
      "strengths_limitations",
    ],
  };

  const response = await fetch("http://localhost:11434/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: SYSTEM_MESSAGE },
        { role: "user", content: prompt },
      ],
      format: outputSchema,
      stream: false,
      think: true,
      options: { num_ctx: 32768, temperature: 0.2 },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    ztoolkit.log(`Ollama API error: ${response.status} - ${errorText}`);
    throw new Error(
      `API request failed: ${response.status} ${response.statusText}`,
    );
  }

  const data = (await response.json()) as unknown as {
    message: { role: string; content: string; thinking?: string };
    prompt_eval_count?: number;
    eval_count?: number;
  };

  if (!data.message || !data.message.content) {
    throw new Error("No response from Ollama");
  }

  if (data.message.thinking) {
    ztoolkit.log(`Thinking trace: ${data.message.thinking.slice(0, 200)}...`);
  }

  return {
    content: data.message.content,
    usage:
      data.prompt_eval_count != null
        ? `Prompt: ${data.prompt_eval_count}, Completion: ${data.eval_count ?? 0}`
        : undefined,
  };
}

/**
 * Fetch available models from the selected provider
 */
export async function fetchModels(
  apiKey: string,
  provider: ProviderId = "grok",
): Promise<ModelInfo[]> {
  if (provider === "anthropic") {
    return fetchAnthropicModels(apiKey);
  }

  if (provider === "gemini") {
    return fetchGeminiModels(apiKey);
  }

  // OpenAI-compatible (Grok, OpenAI, Ollama)
  const baseUrl = PROVIDERS[provider].baseUrl;
  const headers: Record<string, string> = {};
  if (apiKey) {
    headers["Authorization"] = `Bearer ${apiKey}`;
  }

  const response = await fetch(`${baseUrl}/models`, {
    method: "GET",
    headers,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Failed to fetch models: ${response.status} - ${errorText}`,
    );
  }

  const data = (await response.json()) as unknown as { data: ModelInfo[] };
  return data.data || [];
}

/**
 * Fetch models from Anthropic API
 */
async function fetchAnthropicModels(apiKey: string): Promise<ModelInfo[]> {
  const response = await fetch(
    `${PROVIDERS.anthropic.baseUrl}/models?limit=100`,
    {
      method: "GET",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
    },
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Failed to fetch Anthropic models: ${response.status} - ${errorText}`,
    );
  }

  const data = (await response.json()) as unknown as {
    data: Array<{ id: string; display_name?: string }>;
  };
  return (data.data || []).map((m) => ({ id: m.id }));
}

/**
 * Fetch models from Gemini API (native endpoint)
 */
async function fetchGeminiModels(apiKey: string): Promise<ModelInfo[]> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
    { method: "GET" },
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Failed to fetch Gemini models: ${response.status} - ${errorText}`,
    );
  }

  const data = (await response.json()) as unknown as {
    models: Array<{
      name: string;
      displayName: string;
      supportedGenerationMethods: string[];
    }>;
  };

  // Filter to models that support generateContent, strip "models/" prefix
  return (data.models || [])
    .filter((m) => m.supportedGenerationMethods?.includes("generateContent"))
    .map((m) => ({
      id: m.name.replace("models/", ""),
      owned_by: "google",
    }));
}
