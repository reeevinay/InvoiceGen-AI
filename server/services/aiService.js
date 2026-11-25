const GEMINI_MODELS = [
  "gemini-3.8-flash",
  "gemini-flash-latest",
  "gemini-flash-lite-latest",
];

export const hasGeminiKey = () => Boolean(process.env.GEMINI_API_KEY?.trim());

export const callGemini = async ({
  prompt,
  systemInstruction,
  responseSchema = null,
}) => {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  const body = {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    ...(systemInstruction
      ? { systemInstruction: { parts: [{ text: systemInstruction }] } }
      : {}),
    generationConfig: {
      temperature: 0.2,
      ...(responseSchema
        ? {
            responseMimeType: "application/json",
            responseSchema,
          }
        : {}),
    },
  };

  let lastError = null;
  for (const model of GEMINI_MODELS) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(
      apiKey
    )}`;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (response.ok) {
      const data = await response.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) {
        return responseSchema ? JSON.parse(text) : text;
      }
      lastError = new Error(`Empty response from ${model}`);
      continue;
    }

    const errText = await response.text();
    lastError = new Error(`Gemini API error (${response.status} on ${model}): ${errText}`);
    if (response.status !== 503 && response.status !== 404 && response.status !== 429) {
      throw lastError;
    }
  }

  throw lastError || new Error("All Gemini models failed");
};
