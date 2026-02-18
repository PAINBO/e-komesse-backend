require('dotenv').config()
const express = require('express')
const axios = require('axios')
const cors = require('cors')
const path = require('path')

const app = express()
app.use(cors())
app.use(express.json())

// Serve static files (index.html, css, js, data, IMG)
app.use(express.static(path.join(__dirname)))

const PORT = process.env.PORT || 3000
app.get('/api/search', async (req, res) => {
  const q = (req.query.q || '').trim()
  if (!q) return res.status(400).json({ error: 'Missing query parameter `q`' })

  // Prefer Google Programmable Search if configured
  const googleKey = process.env.GOOGLE_API_KEY
  const googleCx = process.env.GOOGLE_CX
  const serpKey = process.env.SERPAPI_KEY

  // Logging for debugging
  console.log(`[search] q="${q}"`)
  console.log(`[search] providers: GOOGLE=${!!googleKey}, SERPAPI=${!!serpKey}`)

  try {
    if (googleKey && googleCx) {
      console.log('[search] using Google Custom Search')
      const url = `https://www.googleapis.com/customsearch/v1?key=${encodeURIComponent(googleKey)}&cx=${encodeURIComponent(googleCx)}&q=${encodeURIComponent(q)}`
      const r = await axios.get(url, { timeout: 15000 })
      console.log('[search] google status', r.status)
      const items = Array.isArray(r.data.items) ? r.data.items.map(i => ({ title: i.title || '', snippet: i.snippet || '', link: i.link || '' })) : []
      return res.json({ provider: 'google', items })
    }

    if (serpKey) {
      console.log('[search] using SerpAPI')
      const params = new URLSearchParams({ q, engine: 'google', api_key: serpKey })
      const url = `https://serpapi.com/search.json?${params.toString()}`
      const r = await axios.get(url, { timeout: 15000 })
      console.log('[search] serpapi status', r.status)
      const organic = Array.isArray(r.data.organic_results) ? r.data.organic_results : []
      const items = organic.map(o => ({ title: o.title || '', snippet: o.snippet || (o.rich_snippet && o.rich_snippet.top && o.rich_snippet.top.extensions ? o.rich_snippet.top.extensions.join(' ') : ''), link: o.link || '' }))
      return res.json({ provider: 'serpapi', items })
    }

    // DuckDuckGo fallback (no key required)
    console.log('[search] using DuckDuckGo fallback')
    const ddgUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(q)}&format=json&no_html=1&skip_disambig=1`
    const rr = await axios.get(ddgUrl, { timeout: 10000 })
    console.log('[search] duckduckgo status', rr.status)
    const items = []
    if (rr.data && rr.data.AbstractText) {
      items.push({ title: rr.data.Heading || q, snippet: rr.data.AbstractText, link: rr.data.AbstractURL || '' })
    }
    if (rr.data && Array.isArray(rr.data.RelatedTopics)) {
      rr.data.RelatedTopics.forEach(t => {
        if (t.Text && t.FirstURL) items.push({ title: t.Text.split(' - ')[0], snippet: t.Text, link: t.FirstURL })
        else if (t.Topics && Array.isArray(t.Topics)) t.Topics.forEach(st => items.push({ title: st.Text.split(' - ')[0], snippet: st.Text, link: st.FirstURL }))
      })
    }
    return res.json({ provider: 'duckduckgo', items })
  } catch (err) {
    console.error('[search] error', err && (err.stack || err.toString()))
    return res.status(500).json({ error: 'Search provider error', detail: err && (err.stack || err.toString()) })
  }
})

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT} — serves static files and /api/search`))
