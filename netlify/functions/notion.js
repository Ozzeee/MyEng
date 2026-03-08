// netlify/functions/notion.js
// Proxy for Notion API to avoid CORS issues

const NOTION_API = 'https://api.notion.com/v1'
const NOTION_VERSION = '2022-06-28'
const DATABASE_ID = '31d70567-e99a-8064-98b3-000b67bbc2e6'

export const handler = async (event) => {
  const token = process.env.NOTION_TOKEN
  if (!token) {
    return { statusCode: 500, body: JSON.stringify({ error: 'NOTION_TOKEN not set' }) }
  }

  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    'Notion-Version': NOTION_VERSION,
  }

  const action = event.queryStringParameters?.action
  const body = event.body ? JSON.parse(event.body) : {}

  try {
    // GET cards from database
    if (action === 'list') {
      const filter = body.tag
        ? { filter: { property: 'Tags', multi_select: { contains: body.tag } } }
        : {}

      const res = await fetch(`${NOTION_API}/databases/${DATABASE_ID}/query`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          sorts: [{ timestamp: 'created_time', direction: 'descending' }],
          page_size: 100,
          ...filter,
        }),
      })
      const data = await res.json()

      const cards = (data.results || []).map(page => ({
        id: page.id,
        word: page.properties?.Name?.title?.[0]?.plain_text || '',
        translation: page.properties?.Translation?.rich_text?.[0]?.plain_text || '',
        transcription: page.properties?.Transcription?.rich_text?.[0]?.plain_text || '',
        examples: (page.properties?.Examples?.rich_text?.[0]?.plain_text || '').split(' | ').filter(Boolean),
        synonyms: parsePairs(page.properties?.Synonyms?.rich_text?.[0]?.plain_text || ''),
        antonyms: parsePairs(page.properties?.Antonyms?.rich_text?.[0]?.plain_text || ''),
        tags: (page.properties?.Tags?.multi_select || []).map(t => t.name),
        mastered: page.properties?.Mastered?.checkbox || false,
        addedAt: page.created_time,
      }))

      return { statusCode: 200, body: JSON.stringify({ cards }) }
    }

    // CREATE card
    if (action === 'create') {
      const { word, translation, transcription, examples, synonyms, antonyms, tags } = body

      const res = await fetch(`${NOTION_API}/pages`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          parent: { database_id: DATABASE_ID },
          properties: {
            Name: { title: [{ text: { content: word } }] },
            Translation: { rich_text: [{ text: { content: translation || '' } }] },
            Transcription: { rich_text: [{ text: { content: transcription || '' } }] },
            Examples: { rich_text: [{ text: { content: (examples || []).join(' | ') } }] },
            Synonyms: { rich_text: [{ text: { content: formatPairs(synonyms) } }] },
            Antonyms: { rich_text: [{ text: { content: formatPairs(antonyms) } }] },
            Tags: { multi_select: (tags || []).map(t => ({ name: t })) },
            Mastered: { checkbox: false },
          },
        }),
      })
      const data = await res.json()
      return { statusCode: 200, body: JSON.stringify({ id: data.id }) }
    }

    // UPDATE mastered status
    if (action === 'mastered') {
      const { id, mastered } = body
      await fetch(`${NOTION_API}/pages/${id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          properties: { Mastered: { checkbox: mastered } },
        }),
      })
      return { statusCode: 200, body: JSON.stringify({ ok: true }) }
    }

    return { statusCode: 400, body: JSON.stringify({ error: 'Unknown action' }) }
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) }
  }
}

function parsePairs(str) {
  if (!str) return []
  return str.split(' | ').map(s => {
    const match = s.match(/^(.+?)\s*\((.+)\)$/)
    return match ? { word: match[1].trim(), note: match[2].trim() } : { word: s.trim(), note: '' }
  }).filter(p => p.word)
}

function formatPairs(pairs) {
  if (!pairs || !pairs.length) return ''
  return pairs.map(p => p.note ? `${p.word} (${p.note})` : p.word).join(' | ')
}
