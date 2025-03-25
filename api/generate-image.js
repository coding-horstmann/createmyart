/**
 * API-Endpunkt für die Runware-Bildgenerierung
 * Stellt einen Proxy-Endpunkt für die Runware-API bereit,
 * damit der API-Key nicht im Frontend verfügbar sein muss
 */

// Node-fetch importieren für Node.js-Umgebungen, die fetch nicht unterstützen
const fetch = require('node-fetch');
// UUID für ältere Node-Versionen
const { v4: uuidv4 } = require('uuid');

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

    // Generiere UUID für die Anfrage
    const taskUUID = uuidv4();
    
    console.log('Runware API-Anfrage mit Prompt:', prompt);
    
    // Payload für die Runware API gemäß Dokumentation
    // Das authentication-Objekt muss als erstes Element im Array stehen
    const payload = [
      {
        taskType: "authentication",
        apiKey: apiKey
      },
      {
        taskType: "imageInference",
        taskUUID: taskUUID,
        positivePrompt: prompt,
        width: 512,
        height: 704,
        model: "runware:101@1",
        numberResults: 1
      }
    ];

    // Runware API aufrufen
    const response = await fetch('https://api.runware.ai/v1', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(payload)
    });

    // Überprüfen, ob die Anfrage erfolgreich war
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Runware API-Fehler:', response.status, errorText);
      return res.status(response.status).json({ 
        error: 'Fehler bei der Runware API-Anfrage', 
        message: `Status: ${response.status}, Antwort: ${errorText}`
      });
    }

    // Antwort parsen
    const data = await response.json();
    console.log('Runware API-Antwort:', JSON.stringify(data));

    // Verarbeiten der API-Antwort
    if (data.data && data.data.length > 0) {
      // Finde den Image-Inference-Response (nicht das Auth-Objekt)
      const imageData = data.data.find(item => item.taskType === 'imageInference') || data.data[0];
      
      // Formate das Bild in das vom Frontend erwartete Format
      const formattedResponse = {
        data: [{
          taskType: "imageInference",
          taskUUID: imageData.taskUUID || taskUUID,
          url: imageData.imageURL, // Runware gibt imageURL zurück
          model: "runware-model",
          metadata: {
            prompt: prompt
          }
        }]
      };
      
      return res.status(200).json(formattedResponse);
    } else if (data.errors) {
      console.error('Runware API-Fehler in Antwort:', data.errors);
      return res.status(400).json({ error: 'Fehler bei der Bildgenerierung', errors: data.errors });
    } else {
      return res.status(500).json({ error: 'Unerwartetes Format der Runware-API-Antwort', data });
    }
  } catch (error) {
    console.error('Fehler bei der Bildgenerierung:', error);
    return res.status(500).json({ error: 'Fehler bei der Bildgenerierung', message: error.message });
  }
}

module.exports = {
  default: handler
}; 