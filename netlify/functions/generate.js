// netlify/functions/generate.js
// Proxy for Anthropic Claude API

export const handler = async (event) => {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return { statusCode: 500, body: JSON.stringify({ error: 'ANTHROPIC_API_KEY not set' }) }
  }

  const { words } = JSON.parse(event.body || '{}')
  if (!words) {
    return { statusCode: 400, body: JSON.stringify({ error: 'No words provided' }) }
  }

  const isRussian = /[а-яё]/i.test(words)
  const direction = isRussian
    ? 'Russian input → generate English flashcards (Name=Russian word, Translation=English)'
    : 'English input → generate Russian flashcards (Name=English word, Translation=Russian)'

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        system: `You are a flashcard generator for a B1+ Russian product designer learning professional English.
Direction: ${direction}
Return ONLY a raw JSON array, no markdown, no explanation.
Each item: {
  "word": string,
  "translation": string,
  "transcription": string (IPA for English words),
  "examples": [3 workplace/design context sentences],
  "synonyms": [{"word": string, "note": string}] (2-3 items),
  "antonyms": [{"word": string, "note": string}] (2-3 items),
  "tags": array of relevant tags from: ["work","meeting","email","design","grammar"]
}`,
        messages: [{ role: 'user', content: `Generate flashcards for these words/phrases:\n${words}` }],
      }),
    })

    const data = await res.json()
    const text = data.content?.[0]?.text?.replace(/```json|```/g, '').trim() || '[]'

    let cards
    try {
      cards = JSON.parse(text)
    } catch {
      return { statusCode: 500, body: JSON.stringify({ error: 'Failed to parse AI response' }) }
    }

    return { statusCode: 200, body: JSON.stringify({ cards }) }
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) }
  }
}
