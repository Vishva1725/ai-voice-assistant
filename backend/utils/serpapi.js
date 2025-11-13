import axios from 'axios'

export async function serpSearch(query){
  try{
    const key = process.env.SERPAPI_KEY
    if(!key) throw new Error('SERPAPI_KEY not set')
    const url = `https://serpapi.com/search.json?q=${encodeURIComponent(query)}&hl=en&gl=us&api_key=${key}`
    const res = await axios.get(url)
    // Try to get a useful snippet
    const snippet = res.data?.organic_results?.[0]?.snippet || res.data?.answer || res.data?.knowledge_graph?.description || null
    return { raw: res.data, snippet }
  }catch(err){
    console.error('SerpAPI error', err?.message||err)
    return { raw: null, snippet: null }
  }
}
