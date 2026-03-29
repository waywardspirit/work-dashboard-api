module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { dbId } = req.query;
  const key = process.env.NOTION_API_KEY;

  if (!key) {
    return res.status(500).json({ error: 'Missing NOTION_API_KEY' });
  }

  try {
    const response = await fetch('https://api.notion.com/v1/databases/' + dbId + '/query', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + key,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ page_size: 50 })
    });

    const data = await response.json();
    const results = (data.results || []).map(function(page) {
      const props = page.properties || {};
      let title = '';
      let content = '';
      let date = page.created_time ? page.created_time.split('T')[0] : '';

      Object.keys(props).forEach(function(k) {
        const p = props[k];
        if (p.type === 'title' && p.title && p.title.length) {
          title = p.title.map(function(t) { return t.plain_text; }).join('');
        }
        if (p.type === 'date' && p.date && p.date.start) {
          date = p.date.start;
        }
        if (p.type === 'rich_text' && p.rich_text && p.rich_text.length) {
          content += p.rich_text.map(function(t) { return t.plain_text; }).join('') + ' ';
        }
      });

      content = content.trim();
      const jobMatch = content.match(/JOB[S]?\s*=\s*\(?([^)\n]+)\)?/i);
      let context = 'Personal';
      if (jobMatch) {
        const val = jobMatch[1].trim().toLowerCase();
        if (val.includes('toast')) context = 'Toast';
        else if (val.includes('davis') || val.includes('uc')) context = 'UC Davis';
        else if (val.includes('summon')) context = 'Summon and Sell';
        else context = jobMatch[1].trim();
      }

      return { title: title || 'Untitled', date: date, content: content, context: context };
    });

    return res.status(200).json({ results: results, count: results.length });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
