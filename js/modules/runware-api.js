// Importiere die Konfiguration
import { config } from '../config.js';

// Runware API Integration
export const RunwareAPI = {
    // API Key wird aus der Konfiguration geladen
    getApiKey() {
        return config.getRunwareApiKey();
    },

    // WebSocket Verbindung
    async connectWebSocket() {
        return new Promise((resolve, reject) => {
            const ws = new WebSocket('wss://ws-api.runware.ai/v1');
            
            ws.onopen = () => {
                // Authentifizierung senden
                ws.send(JSON.stringify([{
                    taskType: "authentication",
                    apiKey: this.getApiKey()
                }]));
                resolve(ws);
            };
            
            ws.onerror = (error) => {
                reject(error);
            };
        });
    },

    // Bildgenerierung über Server-Endpunkt
    async generateImage(prompt) {
        try {
            // Anfrage an den Server-Endpunkt statt direkt an Runware
            const response = await fetch('/api/generate-image', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ prompt })
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Fehler bei der Bildgenerierung');
            }
            
            const data = await response.json();
            
            if (data.data) {
                return data.data[0];
            } else if (data.errors) {
                throw new Error(data.errors[0].message);
            } else {
                throw new Error("Ungültige Antwort von der API");
            }
        } catch (error) {
            throw new Error(`Fehler bei der Bildgenerierung: ${error.message}`);
        }
    },

    // Fallback: Direkte Bildgenerierung (nur für Entwicklungszwecke)
    async generateImageFallback(prompt) {
        try {
            console.warn('Verwende Fallback-Methode für Bildgenerierung - nur für Entwicklung');
            
            // Simuliere eine Antwort für die Entwicklung
            return {
                taskType: "imageInference",
                taskUUID: crypto.randomUUID(),
                base64: "",
                url: "data:image/svg+xml;charset=UTF-8,%3Csvg%20width%3D%22512%22%20height%3D%22512%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Crect%20width%3D%22512%22%20height%3D%22512%22%20fill%3D%22%23f2f2f2%22%2F%3E%3Ctext%20x%3D%22256%22%20y%3D%22256%22%20font-family%3D%22Arial%22%20font-size%3D%2224%22%20fill%3D%22%23333%22%20text-anchor%3D%22middle%22%3EBild%20konnte%20nicht%20generiert%20werden%3C%2Ftext%3E%3C%2Fsvg%3E",
                model: "fallback-model",
                promptStrength: 7,
                negativePrompt: "",
                metadata: {
                    prompt: prompt
                }
            };
        } catch (error) {
            throw new Error(`Fehler bei der Fallback-Bildgenerierung: ${error.message}`);
        }
    }
}; 