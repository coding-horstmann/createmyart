// Importiere die Umgebungsvariablen-Funktionen
import { getEnv } from './env-loader.js';

// Konfigurationsdatei für API-Zugangsdaten und Einstellungen
export const config = {
    // Prüfen ob die Umgebung Vercel ist
    isVercelProduction() {
        return window.location.hostname.endsWith('vercel.app') || window.location.hostname.includes('.vercel.app');
    },
    
    // Basis-URL für API-Aufrufe
    getApiBaseUrl() {
        // In Produktion, verwende die aktuelle Domain
        if (this.isVercelProduction()) {
            return '';
        }
        // In Entwicklung, verwende localhost
        return 'http://localhost:3000';
    },
    
    // Umgebungsvariable abrufen
    getEnvVar(key, defaultValue = '') {
        return getEnv(key, defaultValue);
    }
}; 