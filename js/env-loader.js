/**
 * Umgebungsvariablen-Loader für Vercel-Hosting
 * Lädt Umgebungsvariablen über environment variables oder API-Endpunkte
 */

// Objekt für Umgebungsvariablen
let envVars = {};
let isLoaded = false;

// Funktion zum Laden der Umgebungsvariablen
async function loadEnvironmentVariables() {
  try {
    console.log('Lade Umgebungsvariablen...');
    
    if (isLoaded) {
      return envVars;
    }

    // Versuchen, Umgebungsvariablen vom Server zu laden
    try {
      // Versuche zuerst direkte Umgebungsvariablen zu nutzen (falls verfügbar)
      if (window.ENV && window.ENV.FIREBASE_API_KEY) {
        console.log('Verwende direkte Umgebungsvariablen');
        envVars = window.ENV;
        isLoaded = true;
        return envVars;
      }

      // Sonst vom API-Endpunkt laden
      console.log('Lade Umgebungsvariablen vom API-Endpunkt...');
      const apiUrl = window.location.hostname.includes('localhost') ? 
        'http://localhost:3000/api/env' : 
        '/api/env';
      
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        envVars = data;
        console.log('Umgebungsvariablen vom Server geladen');
      } else {
        console.warn('Konnte Umgebungsvariablen nicht vom Server laden, verwende Fallback');
        setEmptyConfig();
      }
    } catch (error) {
      console.warn('Fehler beim Laden der Umgebungsvariablen vom Server:', error);
      setEmptyConfig();
    }
    
    isLoaded = true;
    console.log('Umgebungsvariablen erfolgreich geladen');
  } catch (error) {
    console.error('Fehler beim Laden der Umgebungsvariablen:', error);
    setEmptyConfig();
  }
  
  return envVars;
}

// Leere Konfiguration für sicheren Betrieb
function setEmptyConfig() {
  console.warn('Verwende leere Konfiguration - Serveraufrufe erforderlich');
  envVars = {
    // Keine API-Schlüssel mehr direkt im Frontend
    FIREBASE_API_KEY: '',
    FIREBASE_AUTH_DOMAIN: '',
    FIREBASE_PROJECT_ID: '',
    FIREBASE_STORAGE_BUCKET: '',
    FIREBASE_MESSAGING_SENDER_ID: '',
    FIREBASE_APP_ID: '',
    FIREBASE_MEASUREMENT_ID: '',
    ADMIN_EMAIL: 'kontakt@create-my-art.de',
    PAYPAL_CLIENT_ID: '',
    RUNWARE_API_KEY: ''
  };
}

// Funktion zum Abrufen einer Umgebungsvariable
function getEnv(key, defaultValue = '') {
  return envVars[key] || defaultValue;
}

// Exportiere die Funktionen
export { loadEnvironmentVariables, getEnv }; 