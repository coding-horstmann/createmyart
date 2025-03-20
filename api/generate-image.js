/**
 * API-Endpunkt für die Runware-Bildgenerierung
 * Stellt einen Proxy-Endpunkt für die Runware-API bereit,
 * damit der API-Key nicht im Frontend verfügbar sein muss
 */

export default async function handler(req, res) {
  // CORS-Header für Cross-Origin-Anfragen
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Bei OPTIONS-Anfragen sofort antworten (für CORS-Preflight)
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Nur POST-Anfragen akzeptieren
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Prompt aus der Anfrage extrahieren
    const { prompt } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    // API-Key aus den Umgebungsvariablen laden
    const apiKey = process.env.RUNWARE_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ error: 'Runware API key not configured' });
    }

    // Runware API aufrufen
    const response = await fetch('https://api.runware.ai/v1', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify([
        {
          taskType: "imageInference",
          taskUUID: crypto.randomUUID(),
          positivePrompt: prompt,
          width: 512,
          height: 512,
          model: "civitai:102438@133677",
          numberResults: 1
        }
      ])
    });

    // Antwort parsen
    const data = await response.json();

    // Antwort an den Client weiterleiten
    return res.status(200).json(data);
  } catch (error) {
    console.error('Error generating image:', error);
    return res.status(500).json({ error: 'Error generating image', message: error.message });
  }
} 