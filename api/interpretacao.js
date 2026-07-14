module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      success: false,
      error: 'Chave da API não configurada no Vercel.'
    });
  }

  try {
    const { prompt, system, max_tokens } = req.body;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: max_tokens || 2000,
        system: system || '',
        messages: [{ role: 'user', content: prompt }]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(200).json({
        success: false,
        error: 'Erro API: ' + response.status + ' - ' + errorText
      });
    }

    const data = await response.json();
    const text = data.content
      .filter(function(item) { return item.type === 'text'; })
      .map(function(item) { return item.text; })
      .join('\n');

    return res.status(200).json({ success: true, text: text });

  } catch (error) {
    return res.status(200).json({
      success: false,
      error: 'Erro interno: ' + error.message
    });
  }
};
