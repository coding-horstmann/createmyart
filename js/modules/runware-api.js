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
                // Fetch unterstützt keine direkte timeout-Option
            });
            
            if (!response.ok) {
                // Bei HTTP-Statuscode 504 (Gateway Timeout) spezifische Fehlermeldung liefern
                if (response.status === 504) {
                    throw new Error('Die Bildgenerierung hat zu lange gedauert. Bitte versuche es mit einem kürzeren Prompt oder versuche es später erneut.');
                }
                
                // Bei zu vielen Anfragen (429)
                if (response.status === 429) {
                    throw new Error('Bitte warte einen Moment, bevor du denselben Prompt erneut verwendest.');
                }
                
                // Für andere Fehler versuchen wir, die JSON-Antwort zu lesen
                const responseText = await response.text();
                let errorMessage;
                
                try {
                    // Versuche, die Antwort als JSON zu parsen
                    const errorData = JSON.parse(responseText);
                    errorMessage = errorData.message || errorData.error || `Fehler bei der Bildgenerierung: ${response.status} ${response.statusText}`;
                } catch (jsonError) {
                    // Falls die Antwort kein gültiges JSON ist
                    console.error('Keine gültige JSON-Antwort vom Server:', responseText.substring(0, 150));
                    errorMessage = `Fehler bei der Bildgenerierung: ${response.status} ${response.statusText}`;
                }
                
                throw new Error(errorMessage);
            }
            
            // Vorsichtig die JSON-Antwort parsen
            let data;
            const responseText = await response.text();
            
            try {
                data = JSON.parse(responseText);
            } catch (jsonError) {
                console.error('Fehler beim Parsen der API-Antwort als JSON:', responseText.substring(0, 150));
                throw new Error('Die API hat eine ungültige Antwort zurückgegeben. Bitte versuche es mit einem kürzeren Prompt.');
            }
            
            if (data.data && data.data.length > 0) {
                return data.data[0];
            } else if (data.errors) {
                throw new Error(data.errors[0].message || 'Fehler bei der Bildgenerierung');
            } else {
                throw new Error("Ungültige Antwort von der API. Bitte versuche es erneut.");
            }
        } catch (error) {
            console.error('Fehler bei der Bildgenerierung:', error);
            throw error;
        }
    },

    // Direkte Bildgenerierung mit API-Key gemäß Runware-Dokumentation
    async generateImageDirect(prompt, apiKey) {
        try {
            console.log('Generiere Bild direkt mit Runware API');
            
            // UUID für die Anfrage generieren
            const taskUUID = this.generateUUID();
            
            // Korrekter Aufbau der Anfrage gemäß Dokumentation
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
                    model: "rundiffusion:130@100", // Rundiffusion-Modell
                    numberResults: 1
                }
            ];
            
            console.log('Sende Anfrage an Runware API mit Payload:', JSON.stringify(payload));
            
            const response = await fetch('https://api.runware.ai/v1', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify(payload)
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('Fehler-Antwort von Runware API:', errorText);
                throw new Error(`API-Anfragefehler: ${response.status} ${response.statusText}`);
            }
            
            const data = await response.json();
            console.log('Runware API Antwort:', data);
            
            if (data.data && data.data.length > 0) {
                const imageData = data.data[0];
                console.log('Bild erfolgreich generiert:', imageData);
                
                // Korrektes Format für unsere Anwendung
                return {
                    taskType: "imageInference",
                    taskUUID: imageData.taskUUID || taskUUID,
                    url: imageData.imageURL, // Runware gibt imageURL zurück
                    model: imageData.model || "rundiffusion:130@100",
                    metadata: {
                        prompt: prompt
                    }
                };
            } else if (data.errors && data.errors.length > 0) {
                console.error('Runware API Fehler:', data.errors);
                throw new Error(data.errors[0].message);
            } else {
                console.error('Keine Bilddaten in der API-Antwort:', data);
                throw new Error('Keine Bilddaten in der API-Antwort');
            }
        } catch (error) {
            console.error('Fehler bei direkter Bildgenerierung:', error);
            throw error;
        }
    },
    
    // Alternative direkte Bildgenerierung mit WebSocket
    async generateImageWebSocket(prompt, apiKey) {
        try {
            console.log('Generiere Bild mit Runware WebSocket API');
            const ws = await this.connectWebSocket();
            
            // UUID für die Anfrage generieren
            const taskUUID = this.generateUUID();
            
            return new Promise((resolve, reject) => {
                // Timeout nach 30 Sekunden
                const timeout = setTimeout(() => {
                    ws.close();
                    reject(new Error('Timeout bei der WebSocket-Verbindung'));
                }, 30000);
                
                // Nachrichtenverarbeitung
                ws.onmessage = (event) => {
                    try {
                        const data = JSON.parse(event.data);
                        console.log('WebSocket Antwort:', data);
                        
                        if (data.data && data.data.length > 0) {
                            // Authentifizierungsnachricht überspringen
                            if (data.data[0].taskType === 'authentication') {
                                return;
                            }
                            
                            // Bilddaten verarbeiten
                            const imageData = data.data[0];
                            clearTimeout(timeout);
                            ws.close();
                            
                            resolve({
                                taskType: "imageInference",
                                taskUUID: imageData.taskUUID || taskUUID,
                                url: imageData.imageURL,
                                model: "rundiffusion:130@100",
                                metadata: {
                                    prompt: prompt
                                }
                            });
                        } else if (data.errors && data.errors.length > 0) {
                            clearTimeout(timeout);
                            ws.close();
                            reject(new Error(data.errors[0].message));
                        }
                    } catch (error) {
                        clearTimeout(timeout);
                        ws.close();
                        reject(error);
                    }
                };
                
                // Fehlerbehandlung
                ws.onerror = (error) => {
                    clearTimeout(timeout);
                    ws.close();
                    reject(error);
                };
                
                // Verbindungsschließung
                ws.onclose = () => {
                    clearTimeout(timeout);
                    reject(new Error('WebSocket-Verbindung geschlossen'));
                };
                
                // Anfrage senden
                ws.send(JSON.stringify([
                    {
                        taskType: "imageInference",
                        taskUUID: taskUUID,
                        positivePrompt: prompt,
                        width: 512,
                        height: 704,
                        model: "rundiffusion:130@100",
                        numberResults: 1
                    }
                ]));
            });
        } catch (error) {
            console.error('Fehler bei WebSocket-Bildgenerierung:', error);
            // Verwende die direkte Bildgenerierung als Fallback
            try {
                return await this.generateImage(prompt);
            } catch (fallbackError) {
                console.error('Auch Fallback-Bildgenerierung fehlgeschlagen:', fallbackError);
                throw error; // Werfe den ursprünglichen Fehler
            }
        }
    },
    
    // Fallback-Methode für Bildgenerierung bei Problemen mit WebSocket
    async generateImageFallback(prompt) {
        console.log('Verwende Fallback-Methode für Bildgenerierung...');
        try {
            // Einfacher Fallback: Verwende die normale HTTP-API
            return await this.generateImage(prompt);
        } catch (error) {
            console.error('Fehler bei Fallback-Bildgenerierung:', error);
            throw error;
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