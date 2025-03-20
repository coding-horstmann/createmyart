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
            // Versuche direkt die Runware API zu nutzen (für Entwicklung/Tests)
            if (window.ENV && window.ENV.RUNWARE_API_KEY) {
                console.log('Verwende direkte Runware API mit Key aus ENV');
                return this.generateImageDirect(prompt, window.ENV.RUNWARE_API_KEY);
            }

            // Ansonsten über den Server-Proxy
            // Pfad zum API-Endpunkt basierend auf der Umgebung
            const apiUrl = window.location.hostname.includes('localhost') ? 
                'http://localhost:3000/api/generate-image' : 
                '/api/generate-image';
            
            console.log('Sende Bildgenerierungsanfrage an Server-Proxy:', apiUrl);
            
            // Anfrage an den Server-Endpunkt statt direkt an Runware
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Cache-Control': 'no-cache'
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
            console.error('Fehler bei der Bildgenerierung:', error);
            // Wenn die API fehlschlägt, verwenden wir den Fallback
            return this.generateImageFallback(prompt);
        }
    },

    // Fallback: Direkte Bildgenerierung (nur für Entwicklungszwecke)
    async generateImageFallback(prompt) {
        try {
            console.warn('Verwende Fallback-Methode für Bildgenerierung - nur für Entwicklung');
            
            // Ein einfaches SVG als Fallback zurückgeben
            const randomId = Math.floor(Math.random() * 1000);
            return {
                taskType: "imageInference",
                taskUUID: randomId.toString(),
                base64: "",
                url: `data:image/svg+xml;charset=UTF-8,%3Csvg%20width%3D%22512%22%20height%3D%22512%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Crect%20width%3D%22512%22%20height%3D%22512%22%20fill%3D%22%23f2f2f2%22%2F%3E%3Ctext%20x%3D%22256%22%20y%3D%22256%22%20font-family%3D%22Arial%22%20font-size%3D%2224%22%20fill%3D%22%23333%22%20text-anchor%3D%22middle%22%3EFallback-Bild:%20${prompt}%3C%2Ftext%3E%3C%2Fsvg%3E`,
                model: "fallback-model",
                promptStrength: 7,
                negativePrompt: "",
                metadata: {
                    prompt: prompt
                }
            };
        } catch (error) {
            console.error('Fehler bei der Fallback-Bildgenerierung:', error);
            throw new Error(`Fehler bei der Fallback-Bildgenerierung: ${error.message}`);
        }
    },

    // Direkte Bildgenerierung mit API-Key
    async generateImageDirect(prompt, apiKey) {
        try {
            console.log('Generiere Bild direkt mit Runware API');
            
            // UUID für die Anfrage generieren
            const taskUUID = this.generateUUID();
            
            const response = await fetch('https://api.runware.ai/v1', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify([
                    {
                        taskType: "imageInference",
                        taskUUID: taskUUID,
                        positivePrompt: prompt,
                        width: 512,
                        height: 512,
                        model: "civitai:102438@133677",
                        numberResults: 1
                    }
                ])
            });
            
            if (!response.ok) {
                throw new Error(`API-Anfragefehler: ${response.status} ${response.statusText}`);
            }
            
            const data = await response.json();
            console.log('Runware API Antwort:', data);
            
            if (data.data && data.data.length > 0) {
                const imageData = data.data[0];
                console.log('Bild erfolgreich generiert:', imageData);
                return imageData;
            } else if (data.errors && data.errors.length > 0) {
                throw new Error(data.errors[0].message);
            } else {
                console.error('Keine Bilddaten in der API-Antwort:', data);
                return this.generateImageFallback(prompt);
            }
        } catch (error) {
            console.error('Fehler bei direkter Bildgenerierung:', error);
            // Bei Fehlern zum Fallback wechseln
            return this.generateImageFallback(prompt);
        }
    },
    
    // Hilfsfunktion zur Generierung einer UUID
    generateUUID() {
        if (typeof crypto !== 'undefined' && crypto.randomUUID) {
            return crypto.randomUUID();
        }
        
        // Fallback für Browser ohne crypto.randomUUID
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }
}; 