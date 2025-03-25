/**
 * API-Endpunkt für die Runware-Bildgenerierung über WebSocket
 * Dieser Endpunkt dient als Proxy für die Runware WebSocket-API
 */

// Node-fetch importieren für Node.js-Umgebungen, die fetch nicht unterstützen
const fetch = require('node-fetch');

async function handler(req, res) {
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

    // Da WebSockets in serverless Funktionen nicht direkt unterstützt werden,
    // nutzen wir die HTTP API als Fallback
    const response = await fetch('https://api.runware.ai/v1', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify([
        {
          taskType: "imageInference",
          taskUUID: generateUUID(),
          positivePrompt: prompt,
          width: 512,
          height: 704,
          model: "runware:101@1",
          numberResults: 1
        }
      ])
    });

    // Antwort parsen
    const data = await response.json();

    // Antwort an den Client weiterleiten
    return res.status(200).json({
      data: data.data,
      errors: data.errors
    });
  } catch (error) {
    console.error('Error generating image via WebSocket proxy:', error);
    return res.status(500).json({ error: 'Error generating image', message: error.message });
  }
}

// Helper-Funktion zur Generierung einer UUID (als Ersatz für crypto.randomUUID())
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

module.exports = {
  default: handler
}; 