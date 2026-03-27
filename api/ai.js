export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'API key ayarlanmamış.' });
  }

  const { title } = req.body || {};
  if (!title) return res.status(400).json({ error: 'Görev başlığı gerekli' });

  const models = [
    'gemini-2.0-flash-lite',
    'gemini-2.0-flash-lite-001',
    'gemini-2.5-flash-lite',
  ];

  for (const model of models) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: `Bu iş görevi hakkında Türkçe kısa bir özet yaz ve ne yapılması gerektiğine dair 3-4 madde halinde pratik öneriler sun. Görev: "${title}". Yanıtın toplam 150 kelimeyi geçmesin.`
              }]
            }],
            generationConfig: { maxOutputTokens: 500, temperature: 0.7 }
          })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        if (data.error?.code === 429) continue;
        return res.status(response.status).json({ error: 'Gemini hatası: ' + data.error?.message });
      }

      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) return res.status(200).json({ result: text });

    } catch (e) {
      continue;
    }
  }

  return res.status(429).json({ error: 'Günlük ücretsiz kullanım limitine ulaşıldı. Birkaç dakika sonra tekrar deneyin.' });
}
