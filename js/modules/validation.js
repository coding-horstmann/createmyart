/**
 * Validation Module - Enthält Funktionen zur Eingabevalidierung im Frontend
 * Enthält umfassende Validierungsregeln für alle Formularfelder
 */

export const ValidationModule = {
    // Array für verbotene Begriffe
    forbiddenTerms: [],
    // Array für unangemessene Begriffe
    inappropriateTerms: [],
    
    /**
     * Lädt die Liste der verbotenen Begriffe
     * @param {string} url - Die URL zur JSON-Datei mit verbotenen Begriffen
     * @returns {Promise} - Promise, das nach dem Laden aufgelöst wird
     */
    loadForbiddenTerms(url = '/js/modules/forbidden-terms.json') {
        return fetch(url)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Fehler beim Laden der verbotenen Begriffe');
                }
                return response.json();
            })
            .then(data => {
                if (Array.isArray(data)) {
                    this.forbiddenTerms = data.map(term => term.toLowerCase());
                    console.log(`${this.forbiddenTerms.length} verbotene Begriffe geladen`);
                } else {
                    console.error('Verbotene Begriffe haben falsches Format');
                }
            })
            .catch(error => {
                console.error('Fehler beim Laden der verbotenen Begriffe:', error);
            });
    },
    
    /**
     * Lädt die Liste der unangemessenen Begriffe
     * @param {string} url - Die URL zur JSON-Datei mit unangemessenen Begriffen
     * @returns {Promise} - Promise, das nach dem Laden aufgelöst wird
     */
    loadInappropriateTerms(url = '/js/modules/inappropriate-terms.json') {
        return fetch(url)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Fehler beim Laden der unangemessenen Begriffe');
                }
                return response.json();
            })
            .then(data => {
                if (Array.isArray(data)) {
                    this.inappropriateTerms = data.map(term => term.toLowerCase());
                    console.log(`${this.inappropriateTerms.length} unangemessene Begriffe geladen`);
                } else {
                    console.error('Unangemessene Begriffe haben falsches Format');
                }
            })
            .catch(error => {
                console.error('Fehler beim Laden der unangemessenen Begriffe:', error);
            });
    },
    
    /**
     * Initialisiert das Validierungsmodul
     */
    init() {
        this.loadForbiddenTerms();
        this.loadInappropriateTerms();
    },
    
    /**
     * Validiert eine E-Mail-Adresse
     * @param {string} email - Die zu validierende E-Mail-Adresse
     * @returns {boolean} - Gültigkeitsstatus
     */
    isValidEmail(email) {
        if (!email || typeof email !== 'string') return false;
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email.trim());
    },
    
    /**
     * Validiert eine Telefonnummer
     * @param {string} phone - Die zu validierende Telefonnummer
     * @returns {boolean} - Gültigkeitsstatus
     */
    isValidPhone(phone) {
        if (!phone || typeof phone !== 'string') return false;
        // Entferne Leerzeichen, Klammern, Bindestriche und andere Formatierungszeichen
        const cleanPhone = phone.replace(/[\s()\-+]/g, '');
        // Mindestens 6 und maximal 15 Ziffern
        return /^\d{6,15}$/.test(cleanPhone);
    },
    
    /**
     * Validiert eine Postleitzahl (deutsches Format)
     * @param {string} zip - Die zu validierende Postleitzahl
     * @returns {boolean} - Gültigkeitsstatus
     */
    isValidZip(zip) {
        if (!zip || typeof zip !== 'string') return false;
        return /^\d{5}$/.test(zip.trim());
    },
    
    /**
     * Validiert einen Namen (nur Buchstaben, Leerzeichen und Bindestriche)
     * @param {string} name - Der zu validierende Name
     * @returns {boolean} - Gültigkeitsstatus
     */
    isValidName(name) {
        if (!name || typeof name !== 'string') return false;
        return /^[A-Za-zÄäÖöÜüß\s\-]+$/.test(name) && name.trim().length >= 2;
    },
    
    /**
     * Validiert eine Adresszeile
     * @param {string} address - Die zu validierende Adresse
     * @returns {boolean} - Gültigkeitsstatus
     */
    isValidAddress(address) {
        if (!address || typeof address !== 'string') return false;
        // Mindestens 5 Zeichen, keine reinen Ziffern
        return address.trim().length >= 5 && !/^\d+$/.test(address);
    },
    
    /**
     * Validiert ein Formularfeld basierend auf seinem Typ
     * @param {HTMLElement} field - Das zu validierende Formularfeld
     * @returns {boolean} - Gültigkeitsstatus
     */
    validateField(field) {
        if (!field) return false;
        
        const value = field.value;
        const type = field.type || field.dataset.validationType || field.getAttribute('name');
        
        // Validierungstyp basierend auf Element-Attributen ermitteln
        switch(type) {
            case 'email':
                return this.isValidEmail(value);
            case 'tel':
                return this.isValidPhone(value);
            case 'zip':
            case 'postal-code':
                return this.isValidZip(value);
            case 'name':
            case 'first-name':
            case 'last-name':
                return this.isValidName(value);
            case 'address':
            case 'street':
                return this.isValidAddress(value);
            default:
                // Fallback: Prüfe, ob das Feld nicht leer ist
                return value && value.trim().length > 0;
        }
    },
    
    /**
     * Validiert ein komplettes Formular
     * @param {HTMLFormElement} form - Das zu validierende Formular
     * @returns {Object} - Validierungsergebnis mit Status und Fehlermeldungen
     */
    validateForm(form) {
        if (!form) {
            return {
                valid: false,
                errors: ['Formular nicht gefunden']
            };
        }
        
        const formFields = form.querySelectorAll('[required]');
        const errors = [];
        
        formFields.forEach(field => {
            // Entferne zunächst Fehlerklasse
            field.classList.remove('field-error');
            
            // Prüfe das Feld
            if (!this.validateField(field)) {
                field.classList.add('field-error');
                
                // Fehlermeldung basierend auf Feldtyp und -name erstellen
                const fieldName = field.getAttribute('placeholder') || 
                                  field.getAttribute('name') || 
                                  'Feld';
                                  
                errors.push(`${fieldName} ist ungültig oder fehlt`);
            }
        });
        
        return {
            valid: errors.length === 0,
            errors
        };
    },
    
    /**
     * Validiert die Kundendaten
     * @param {object} customerData - Die zu validierenden Kundendaten
     * @returns {object} - Validierungsergebnis mit Status und Fehlermeldungen
     */
    validateCustomer: function(customerData) {
        const errors = {};
        
        if (!customerData.name || !this.isValidName(customerData.name)) {
            errors.name = 'Bitte gib einen gültigen Namen ein';
        }
        
        if (!customerData.email || !this.isValidEmail(customerData.email)) {
            errors.email = 'Bitte gib eine gültige E-Mail-Adresse ein';
        }
        
        if (customerData.phone && !this.isValidPhone(customerData.phone)) {
            errors.phone = 'Bitte gib eine gültige Telefonnummer ein';
        }
        
        if (customerData.address) {
            if (!customerData.address.street || !this.isValidAddress(customerData.address.street)) {
                errors['address.street'] = 'Bitte gib eine gültige Straße ein';
            }
            
            if (!customerData.address.zip || !this.isValidZip(customerData.address.zip)) {
                errors['address.zip'] = 'Bitte gib eine gültige Postleitzahl ein';
            }
            
            if (!customerData.address.city || !this.isValidName(customerData.address.city)) {
                errors['address.city'] = 'Bitte gib einen gültigen Ort ein';
            }
        }
        
        return {
            valid: Object.keys(errors).length === 0,
            errors: errors
        };
    },
    
    /**
     * Prüft, ob ein Text verbotene Begriffe enthält
     * @param {string} text - Der zu prüfende Text
     * @returns {object} - Ergebnis mit Status und gefundenen verbotenen Begriffen
     */
    checkForbiddenTerms(text) {
        if (!text || typeof text !== 'string') {
            return { valid: true, forbiddenTerms: [] };
        }
        
        const textLower = text.toLowerCase();
        const words = textLower.split(/[\s,.;:!?()[\]{}'"«»„"]/); // Teilt den Text in Wörter auf
        
        // Suche nach vollständigen Wörtern
        const foundTerms = this.forbiddenTerms.filter(term => {
            const termWords = term.toLowerCase().split(/\s+/);
            // Einzelnes Wort
            if (termWords.length === 1) {
                return words.includes(term.toLowerCase());
            }
            // Phrase mit mehreren Wörtern
            return textLower.includes(term.toLowerCase());
        });
        
        return {
            valid: foundTerms.length === 0,
            forbiddenTerms: foundTerms
        };
    },
    
    /**
     * Prüft, ob ein Text unangemessene Begriffe enthält
     * @param {string} text - Der zu prüfende Text
     * @returns {object} - Ergebnis mit Status und gefundenen unangemessenen Begriffen
     */
    checkInappropriateTerms(text) {
        if (!text || typeof text !== 'string') {
            return { valid: true, inappropriateTerms: [] };
        }
        
        const textLower = text.toLowerCase();
        const words = textLower.split(/[\s,.;:!?()[\]{}'"«»„"]/); // Teilt den Text in Wörter auf
        
        // Suche nach vollständigen Wörtern
        const foundTerms = this.inappropriateTerms.filter(term => {
            const termWords = term.toLowerCase().split(/\s+/);
            // Einzelnes Wort
            if (termWords.length === 1) {
                return words.includes(term.toLowerCase());
            }
            // Phrase mit mehreren Wörtern
            return textLower.includes(term.toLowerCase());
        });
        
        return {
            valid: foundTerms.length === 0,
            inappropriateTerms: foundTerms
        };
    },
    
    /**
     * Validiert einen Prompt-Text (für Text-zu-Bild)
     * @param {string} prompt - Der zu validierende Prompt
     * @returns {object} - Validierungsergebnis mit Status und Fehlermeldungen
     */
    validatePrompt: function(prompt) {
        const minLength = 3;
        const maxLength = 1000;
        const result = {
            valid: true,
            errors: [],
            warnings: []
        };
        
        // Prüfe Länge
        if (!prompt || prompt.trim().length < minLength) {
            result.valid = false;
            result.errors.push(`Der Text muss mindestens ${minLength} Zeichen lang sein.`);
            
            // Zeige benutzerdefinierte Fehlermeldung bei zu kurzem Prompt
            const customAlert = window.showCustomAlert || console.error;
            customAlert("Gib mehr als 2 Buchstaben ein.");
            return false;
        }
        
        if (prompt && prompt.length > maxLength) {
            result.valid = false;
            result.errors.push(`Der Text darf maximal ${maxLength} Zeichen lang sein.`);
        }
        
        // Prüfe auf verbotene Begriffe
        const forbiddenCheck = this.checkForbiddenTerms(prompt);
        if (!forbiddenCheck.valid) {
            result.valid = false;
            result.errors.push('Dein Text enthält markenrechtlich problematische Begriffe.');
        }
        
        // Prüfe auf unangemessene Begriffe
        const inappropriateCheck = this.checkInappropriateTerms(prompt);
        if (!inappropriateCheck.valid) {
            result.valid = false;
            result.errors.push('Dein Text enthält Begriffe, die gegen unsere Nutzungsvereinbarungen verstoßen.');
        }
        
        // Warnungen für potenziell problematische Inhalte
        const sensitivePatterns = [
            /gewalt/i, /nackt/i, /waffe/i, /tod/i, /töten/i,
            /beleidig/i, /hass/i, /rassist/i, /sexuell/i
        ];
        
        for (const pattern of sensitivePatterns) {
            if (pattern.test(prompt)) {
                result.warnings.push('Dein Text enthält möglicherweise sensible Inhalte, die nicht unterstützt werden.');
                break;
            }
        }
        
        return result;
    }
};

// Stelle das Modul global zur Verfügung für bestehenden Code
window.ValidationModule = ValidationModule; 