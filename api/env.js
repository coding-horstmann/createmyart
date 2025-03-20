/**
 * API-Endpunkt zum Abrufen von Umgebungsvariablen
 * Stellt ausgewählte Umgebungsvariablen für das Frontend bereit
 */

function handler(req, res) {
  // CORS-Header für Cross-Origin-Anfragen
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Bei OPTIONS-Anfragen sofort antworten (für CORS-Preflight)
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Prüfen, ob die Anfrage eine GET-Anfrage ist
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Frontend-sichere Umgebungsvariablen bereitstellen
  // Nur benötigte Schlüssel werden hier weitergegeben
  const clientEnvVars = {
    // Firebase Konfiguration
    FIREBASE_API_KEY: process.env.FIREBASE_API_KEY || '',
    FIREBASE_AUTH_DOMAIN: process.env.FIREBASE_AUTH_DOMAIN || '',
    FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID || '',
    FIREBASE_STORAGE_BUCKET: process.env.FIREBASE_STORAGE_BUCKET || '',
    FIREBASE_MESSAGING_SENDER_ID: process.env.FIREBASE_MESSAGING_SENDER_ID || '',
    FIREBASE_APP_ID: process.env.FIREBASE_APP_ID || '',
    FIREBASE_MEASUREMENT_ID: process.env.FIREBASE_MEASUREMENT_ID || '',
    
    // Admin Email (nicht sensitiv)
    ADMIN_EMAIL: process.env.ADMIN_EMAIL || 'kontakt@create-my-art.de',
    
    // PayPal Client ID (nur die client ID ist für das Frontend nötig)
    PAYPAL_CLIENT_ID: process.env.PAYPAL_CLIENT_ID || '',
  };

  // Debugging-Info (nur für Entwicklung)
  console.log('API-Endpunkt für Umgebungsvariablen aufgerufen');

  // HTTP 200 OK mit den Umgebungsvariablen
  return res.status(200).json(clientEnvVars);
}

module.exports = {
  default: handler
}; 