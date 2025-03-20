// Einstiegspunkt für Vercel-Serverless-Funktionen
// Diese Datei dient als zentraler Handler für alle API-Anfragen

const envHandler = require('./api/env');
const generateImageHandler = require('./api/generate-image');
const generateImageWsHandler = require('./api/generate-image-ws');

module.exports = (req, res) => {
  // CORS-Header für alle Anfragen setzen
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Bei OPTIONS-Anfragen sofort antworten (für CORS-Preflight)
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // URL-Pfad extrahieren
  const path = req.url.split('?')[0];

  console.log(`Vercel API-Anfrage empfangen: ${req.method} ${path}`);

  // Anfragen an entsprechende Handler weiterleiten
  try {
    if (path === '/api/env' || path === '/api/env.js') {
      return envHandler.default(req, res);
    } else if (path === '/api/generate-image' || path === '/api/generate-image.js') {
      return generateImageHandler.default(req, res);
    } else if (path === '/api/generate-image-ws' || path === '/api/generate-image-ws.js') {
      return generateImageWsHandler.default(req, res);
    } else {
      return res.status(404).json({ error: 'API-Endpunkt nicht gefunden' });
    }
  } catch (error) {
    console.error('Fehler beim Verarbeiten der API-Anfrage:', error);
    return res.status(500).json({ error: 'Interner Serverfehler', message: error.message });
  }
}; 