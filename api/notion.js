export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { dbId } = req.query;
  const key = process.env.NOTION_API_KEY;

  try {
    const response = await fetch(`https://api.notion.com/v1/databases/${dbId}/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${key}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ page_size: 50 })
    });

    const data = await response.json();

    const results = (data.results || []).map(page => {
      const props = page.properties || {};
      let title = '';
      let content = '';
      let date = page.created_time?.split('T')[0] || '';

      for (const key of Object.keys(props)) {
        const prop = props[key];
        if (prop.type === 'title' && prop.title?.length) {
          title = prop.title.map(t => t.plain_text).join('');
        }
        if (prop.type === 'date' && prop.date?.start) {
          date = prop.date.start;
        }
        if (prop.type === 'rich_text' && prop.rich_text?.length) {
          content += prop.rich_text.map(t => t.plain_text).join('') + ' ';
        }
      }

      content = content.trim();

      const jobMatch = content.match(/JOB\s*=\s*\(([^)]+)\)/i);
      let context = 'Personal';
      if (jobMatch) {
        const val = jobMatch[1].trim().toLowerCase();
        if (val.includes('toast')) context = 'Toast';
        else if (val.includes('davis') || val.includes('uc')) context = 'UC Davis';
        else context = jobMatch[1].trim();
