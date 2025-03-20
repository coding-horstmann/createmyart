/**
 * PayPal-Integration für CreateMyArt
 * Diese Datei handhabt die PayPal-Zahlungsabwicklung
 */

import { getEnv, loadEnvironmentVariables } from './env-loader.js';

/**
 * PayPal-Integrationsklasse
 * Verwaltet die PayPal-Zahlungsabwicklung
 */
class PayPalIntegration {
  constructor() {
    this.clientId = null;
    this.isInitialized = false;
    this.paypalButtonContainer = null;
    this.sdkLoaded = false;
    this.loadPromise = null;
    this.activePaymentContainer = null; // Speichert den aktuellen Zahlungs-Container
    this.activeBackdropElement = null; // Speichert das aktuelle Backdrop-Element
    this.paymentInProgress = false; // Flag für laufende Zahlungen
  }

  /**
   * Initialisiert die PayPal-Integration
   * @returns {Promise<boolean>} True, wenn die Initialisierung erfolgreich war
   */
  async initialize() {
    try {
      // Zuerst Umgebungsvariablen vollständig laden
      await loadEnvironmentVariables();
      
      // PayPal Client ID aus den Umgebungsvariablen laden
      this.clientId = getEnv('PAYPAL_CLIENT_ID');
      
      if (!this.clientId || this.clientId.trim() === '') {
        console.error('PayPal Client ID ist nicht konfiguriert oder leer');
        this.disablePayPalPaymentOption();
        return false;
      }

      // PayPal SDK dynamisch laden
      await this.loadPayPalScript();
      
      this.isInitialized = true;
      console.log('PayPal-Integration erfolgreich initialisiert');
      return true;
    } catch (error) {
      console.error('Fehler bei der Initialisierung der PayPal-Integration:', error);
      this.disablePayPalPaymentOption();
      return false;
    }
  }

  /**
   * Deaktiviert die PayPal-Zahlungsoption im Checkout
   */
  disablePayPalPaymentOption() {
    try {
      const paypalRadio = document.getElementById('payment-paypal');
      if (paypalRadio) {
        paypalRadio.disabled = true;
        
        // Die übergeordnete Zahlungsoption visuell als deaktiviert markieren
        const paymentOption = paypalRadio.closest('.payment-option');
        if (paymentOption) {
          paymentOption.classList.add('disabled');
          
          // Label anpassen, um auf die Deaktivierung hinzuweisen
          const label = paymentOption.querySelector('label');
          if (label) {
            label.innerHTML = label.innerHTML + ' <span class="unavailable-notice">(Derzeit nicht verfügbar)</span>';
          }
        }
      }
      
      // PayPal-Button-Container mit einer Meldung versehen
      const paypalContainer = document.getElementById('paypal-button-container');
      if (paypalContainer) {
        paypalContainer.innerHTML = '<p class="payment-option-disabled">PayPal-Zahlungen sind derzeit nicht verfügbar. Bitte wähle eine andere Zahlungsmethode.</p>';
      }
      
      console.warn('PayPal-Zahlungsoption wurde deaktiviert, da keine gültige Client-ID konfiguriert ist.');
    } catch (err) {
      console.error('Fehler beim Deaktivieren der PayPal-Zahlungsoption:', err);
    }
  }

  /**
   * Lädt das PayPal JavaScript SDK dynamisch
   * @returns {Promise<void>}
   */
  loadPayPalScript() {
    // Rückgabe des existierenden Load-Promise, wenn bereits ein Ladevorgang läuft
    if (this.loadPromise) {
      return this.loadPromise;
    }

    // Rückgabe eines erfolgreich erfüllten Promise, wenn das SDK bereits geladen wurde
    if (this.sdkLoaded && window.paypal) {
      return Promise.resolve();
    }

    // Client-ID prüfen (Sicherheitsprüfung)
    if (!this.clientId || this.clientId.trim() === '') {
      return Promise.reject(new Error('PayPal Client ID ist nicht konfiguriert oder leer'));
    }

    // Neues Load-Promise erstellen
    this.loadPromise = new Promise((resolve, reject) => {
      try {
        // Suche nach einem existierenden Script-Element
        let script = document.getElementById('paypal-js');
        
        // Wenn kein Script-Element gefunden wurde, erstelle eines
        if (!script) {
          console.log('PayPal Script-Element nicht gefunden, erstelle ein neues Element');
          script = document.createElement('script');
          script.id = 'paypal-js';
          script.defer = true;
          document.head.appendChild(script);
        }

        // SDK-URL mit Client-ID und Konfigurationsparametern
        // Zusätzliche Parameter: disable-funding=credit,sepa 
        // Kreditkarten (card) sind nicht deaktiviert, um die Kreditkartenzahlung über PayPal zu ermöglichen
        const sdkUrl = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(this.clientId)}&currency=EUR&intent=capture&disable-funding=credit,sepa`;
        
        // Prüfen, ob das Script bereits die korrekte URL hat
        if (script.src !== sdkUrl) {
          script.src = sdkUrl;
        }
        
        script.onload = () => {
          console.log('PayPal SDK erfolgreich geladen');
          this.sdkLoaded = true;
          this.loadPromise = null;
          resolve();
        };
        
        script.onerror = (error) => {
          console.error('Fehler beim Laden des PayPal SDK:', error);
          this.loadPromise = null;
          this.disablePayPalPaymentOption();
          reject(error);
        };
      } catch (error) {
        console.error('Fehler beim Einrichten des PayPal SDK:', error);
        this.loadPromise = null;
        this.disablePayPalPaymentOption();
        reject(error);
      }
    });

    return this.loadPromise;
  }

  /**
   * Entfernt eventuell noch vorhandene PayPal-Container
   * @private
   */
  _cleanupExistingContainers() {
    // Alle vorhandenen temporären Container entfernen
    const existingContainers = document.querySelectorAll('[id^="temp-paypal-container"]');
    existingContainers.forEach(container => {
      if (document.body.contains(container)) {
        document.body.removeChild(container);
      }
    });
    
    // Alle vorhandenen Backdrop-Elemente entfernen
    const existingBackdrops = document.querySelectorAll('.paypal-backdrop');
    existingBackdrops.forEach(backdrop => {
      if (document.body.contains(backdrop)) {
        document.body.removeChild(backdrop);
      }
    });
    
    // Klassenweite Referenzen zurücksetzen
    this.activePaymentContainer = null;
    this.activeBackdropElement = null;
  }

  /**
   * Rendert die PayPal-Buttons im angegebenen Container
   * @param {string} containerId - Die ID des Container-Elements
   * @param {Object} orderDetails - Details zur Bestellung (Betrag, Artikel, etc.)
   * @param {Function} onApprove - Callback-Funktion, die aufgerufen wird, wenn die Zahlung genehmigt wurde
   * @param {Function} onCancel - Callback-Funktion, die aufgerufen wird, wenn die Zahlung abgebrochen wurde
   * @param {Function} onError - Callback-Funktion, die aufgerufen wird, wenn ein Fehler auftritt
   * @returns {Promise<boolean>} True, wenn die Buttons erfolgreich gerendert wurden
   */
  async renderPayPalButtons(containerId, orderDetails, onApprove, onCancel, onError) {
    try {
      if (!this.isInitialized) {
        const initialized = await this.initialize();
        if (!initialized) {
          throw new Error('PayPal-Integration konnte nicht initialisiert werden');
        }
      }

      // Sicherstellen, dass das PayPal SDK geladen ist
      if (!window.paypal) {
        await this.loadPayPalScript();
      }

      // Container-Element abrufen
      this.paypalButtonContainer = document.getElementById(containerId);
      if (!this.paypalButtonContainer) {
        throw new Error(`Container mit ID "${containerId}" nicht gefunden`);
      }

      // Container leeren
      this.paypalButtonContainer.innerHTML = '';

      // Sicherstellen, dass der Betrag korrekt formatiert ist
      const amount = this.formatAmount(orderDetails.total);

      // PayPal-Buttons rendern
      window.paypal.Buttons({
        style: {
          layout: 'vertical',
          color: 'blue',
          shape: 'rect',
          label: 'paypal'
        },
        
        // Bestellung erstellen
        createOrder: (data, actions) => {
          return actions.order.create({
            purchase_units: [{
              description: 'CreateMyArt - KI-generierte Poster',
              amount: {
                currency_code: 'EUR',
                value: amount,
                breakdown: {
                  item_total: {
                    currency_code: 'EUR',
                    value: amount
                  }
                }
              },
              items: this.formatItems(orderDetails.items)
            }]
          });
        },
        
        // Zahlung genehmigt
        onApprove: async (data, actions) => {
          try {
            // Bestellung erfassen
            console.log("Versuche PayPal-Bestellung zu erfassen...");
            const captureResult = await actions.order.capture();
            console.log('Zahlung erfolgreich:', captureResult);
            
            // Zahlungsdetails für die weitere Verarbeitung
            const paymentDetails = {
              success: true,
              paymentId: captureResult.id,
              payerId: captureResult.payer.payer_id,
              payerEmail: captureResult.payer.email_address,
              status: captureResult.status,
              captureId: captureResult.purchase_units[0].payments.captures[0].id,
              transactionId: captureResult.purchase_units[0].payments.captures[0].id,
              amount: captureResult.purchase_units[0].payments.captures[0].amount.value,
              currency: captureResult.purchase_units[0].payments.captures[0].amount.currency_code,
              paymentMethod: 'paypal',
              paymentProvider: 'PayPal',
              timestamp: new Date().toISOString(),
              rawResponse: captureResult
            };
            
            // Callback aufrufen
            if (typeof onApprove === 'function') {
              onApprove(paymentDetails);
            }
            
            return paymentDetails;
          } catch (error) {
            console.error('Fehler bei der Zahlungserfassung:', error);
            
            // Spezifische Fehlerbehandlung
            if (error.message && error.message.includes('window is closed')) {
              // Fenster wurde geschlossen, als Abbruch behandeln
              if (typeof onCancel === 'function') {
                onCancel({ cancelled: true, reason: 'window_closed' });
              }
              
              return {
                success: false,
                cancelled: true,
                error: 'Das PayPal-Fenster wurde vom Benutzer geschlossen'
              };
            }
            
            // Fehler-Callback aufrufen
            if (typeof onError === 'function') {
              onError(error);
            }
            
            return {
              success: false,
              error: error.message || 'Fehler bei der Zahlungserfassung'
            };
          }
        },
        
        // Zahlung abgebrochen
        onCancel: (data) => {
          console.log('Zahlung abgebrochen:', data);
          
          // Abbruch-Callback aufrufen
          if (typeof onCancel === 'function') {
            onCancel(data);
          }
          
          return {
            success: false,
            cancelled: true,
            error: 'Zahlung wurde abgebrochen'
          };
        },
        
        // Fehler bei der Zahlung
        onError: (error) => {
          console.error('Fehler bei der PayPal-Zahlung:', error);
          
          // Fehler-Callback aufrufen
          if (typeof onError === 'function') {
            onError(error);
          }
          
          return {
            success: false,
            error: 'Fehler bei der PayPal-Zahlung'
          };
        }
      }).render(this.paypalButtonContainer);
      
      console.log('PayPal-Buttons erfolgreich gerendert');
      return true;
    } catch (error) {
      console.error('Fehler beim Rendern der PayPal-Buttons:', error);
      
      // Fehler-Callback aufrufen
      if (typeof onError === 'function') {
        onError(error);
      }
      
      return false;
    }
  }

  /**
   * Formatiert den Betrag für PayPal
   * @param {number|string} amount - Der zu formatierende Betrag
   * @returns {string} Der formatierte Betrag
   */
  formatAmount(amount) {
    // Wenn amount bereits als String in formatierten Cent vorliegt (z.B. "3370")
    // Umwandlung in Euro für PayPal (33.70)
    if (typeof amount === 'string' && !amount.includes('.') && !amount.includes(',')) {
      const numAmount = parseInt(amount, 10);
      if (!isNaN(numAmount)) {
        return (numAmount / 100).toFixed(2);
      }
    }
    
    // Sicherstellen, dass der Betrag eine Zahl ist
    let numericAmount = typeof amount === 'number' ? amount : parseFloat(String(amount).replace(',', '.'));
    
    // Prüfen, ob der Betrag in Cent ist (großer Wert ohne Dezimalpunkt)
    if (numericAmount > 1000 && Number.isInteger(numericAmount)) {
      numericAmount = numericAmount / 100;
    }
    
    // Auf 2 Dezimalstellen runden
    return isNaN(numericAmount) ? '0.00' : numericAmount.toFixed(2);
  }

  /**
   * Formatiert die Artikel für PayPal
   * @param {Array} items - Die zu formatierenden Artikel
   * @returns {Array} Die formatierten Artikel
   */
  formatItems(items) {
    // Überprüfen, ob das Items-Array gültig ist
    if (!items || !Array.isArray(items) || items.length === 0) {
      // Standardartikel zurückgeben, wenn keine Artikel vorhanden sind
      return [{
        name: 'CreateMyArt - KI-generierte Poster',
        description: 'KI-generiertes Kunstwerk',
        unit_amount: {
          currency_code: 'EUR',
          value: '0.00'
        },
        quantity: '1',
        category: 'PHYSICAL_GOODS'
      }];
    }

    return items.map(item => {
      // Preis sicherstellen und von Cent in Euro umwandeln
      let price;
      if (typeof item.price === 'number') {
        // Wenn der Preis eine Zahl ist und größer als 1000, nehmen wir an, dass es Cent sind
        price = item.price > 1000 && Number.isInteger(item.price) ? item.price / 100 : item.price;
      } else {
        // String-Konvertierung
        const priceStr = String(item.price || '0').replace(',', '.');
        price = parseFloat(priceStr);
        
        // Prüfen, ob der Preis in Cent ist (großer Wert ohne Dezimalpunkt)
        if (price > 1000 && !priceStr.includes('.')) {
          price = price / 100;
        }
      }
      
      return {
        name: item.name || item.title || 'KI-generiertes Poster',
        description: item.description || `Größe: ${item.size || 'Standard'}`,
        unit_amount: {
          currency_code: 'EUR',
          value: isNaN(price) ? '0.00' : price.toFixed(2)
        },
        quantity: item.quantity || '1',
        category: 'PHYSICAL_GOODS'
      };
    });
  }

  /**
   * Startet einen direkten Zahlungsprozess mit PayPal ohne vorheriges Rendern von Buttons
   * @param {Object} orderDetails - Details zur Bestellung
   * @param {Function} onApprove - Callback für erfolgreiche Zahlungen
   * @param {Function} onCancel - Callback für abgebrochene Zahlungen
   * @param {Function} onError - Callback für Fehler
   * @param {Object} options - Zusätzliche Optionen (z.B. fundingSource)
   * @returns {Promise<Object>} Zahlungsresultat
   */
  async processDirectPayment(orderDetails, onApprove, onCancel, onError, options = {}) {
    // Falls bereits eine Zahlung läuft, diese zuerst abbrechen
    if (this.paymentInProgress) {
      console.log('Es läuft bereits eine Zahlung. Vorherige Zahlung wird abgebrochen.');
      this._cleanupExistingContainers();
    }
    
    // Neue Zahlung starten
    this.paymentInProgress = true;
    
    return new Promise(async (resolve, reject) => {
      try {
        // Bestehende Container entfernen, um Duplikate zu vermeiden
        this._cleanupExistingContainers();
        
        if (!this.isInitialized) {
          const initialized = await this.initialize();
          if (!initialized) {
            this.paymentInProgress = false;
            throw new Error('PayPal-Integration konnte nicht initialisiert werden');
          }
        }

        // Sicherstellen, dass das PayPal SDK geladen ist
        if (!window.paypal) {
          await this.loadPayPalScript();
        }

        // Container für PayPal-Buttons erstellen
        const tempContainer = document.createElement('div');
        tempContainer.id = 'temp-paypal-container-' + new Date().getTime(); // Eindeutige ID
        tempContainer.style.position = 'fixed';
        tempContainer.style.top = '50%';
        tempContainer.style.left = '50%';
        tempContainer.style.transform = 'translate(-50%, -50%)';
        tempContainer.style.zIndex = '10000';
        tempContainer.style.backgroundColor = 'white';
        tempContainer.style.padding = '20px';
        tempContainer.style.borderRadius = '8px';
        tempContainer.style.boxShadow = '0 4px 16px rgba(0, 0, 0, 0.2)';
        tempContainer.style.width = '450px';
        tempContainer.style.maxWidth = '90%';
        tempContainer.style.maxHeight = '90vh'; // Maximale Höhe auf 90% der Fensterhöhe
        tempContainer.style.overflowY = 'auto'; // Vertikales Scrollen aktivieren
        
        // Ermitteln, ob wir Kreditkarte oder PayPal anzeigen
        const isCardPayment = options?.fundingSource === 'card';
        
        // Überschrift hinzufügen
        const heading = document.createElement('h3');
        heading.textContent = isCardPayment ? 'Bezahlung mit Kreditkarte' : 'Bezahlung mit PayPal';
        heading.style.marginBottom = '15px';
        tempContainer.appendChild(heading);
        
        // Text hinzufügen
        const text = document.createElement('p');
        text.id = 'paypal-wait-text';
        text.textContent = isCardPayment ? 
          'Bitte klicken Sie auf den Button unten, um zur Kreditkartenzahlung zu gelangen:' :
          'Bitte klicken Sie auf den PayPal-Button unten, um zur Zahlung zu gelangen:';
        text.style.marginBottom = '15px';
        text.style.fontWeight = 'normal';
        text.style.color = '#333';
        tempContainer.appendChild(text);
        
        // Pfeil-Element hinzufügen, das auf den Button zeigt (dezenter)
        const arrowContainer = document.createElement('div');
        arrowContainer.style.textAlign = 'center';
        arrowContainer.style.marginBottom = '5px';
        
        const arrow = document.createElement('div');
        arrow.innerHTML = '&#8595;'; // Pfeil nach unten
        arrow.style.fontSize = '18px';
        arrow.style.color = '#999';
        arrow.style.animation = 'none';
        
        arrowContainer.appendChild(arrow);
        tempContainer.appendChild(arrowContainer);
        
        // Button-Container erstellen
        const buttonContainer = document.createElement('div');
        buttonContainer.id = 'paypal-button-inside-' + new Date().getTime(); // Eindeutige ID
        // Button-Container anfangs nicht verstecken, damit er sichtbar ist
        buttonContainer.style.display = 'block';
        tempContainer.appendChild(buttonContainer);
        
        // Schließen-Button erstellen
        const closeBtn = document.createElement('button');
        closeBtn.textContent = 'Abbrechen';
        closeBtn.style.marginTop = '15px';
        closeBtn.style.padding = '8px 16px';
        closeBtn.style.background = '#f5f5f5';
        closeBtn.style.border = '1px solid #ddd';
        closeBtn.style.borderRadius = '4px';
        closeBtn.style.cursor = 'pointer';
        
        // Abbrechen-Handler
        const handleCancel = () => {
          this._cleanupExistingContainers();
          this.paymentInProgress = false;
          
          if (onCancel) {
            onCancel({ cancelled: true });
          }
          
          resolve({
            success: false,
            cancelled: true,
            error: 'Zahlung wurde abgebrochen'
          });
        };
        
        closeBtn.onclick = handleCancel;
        tempContainer.appendChild(closeBtn);
        
        // Backdrop erstellen
        const backdropElement = document.createElement('div');
        backdropElement.className = 'paypal-backdrop'; // Klasse für einfacheres Finden
        backdropElement.style.position = 'fixed';
        backdropElement.style.top = '0';
        backdropElement.style.left = '0';
        backdropElement.style.width = '100%';
        backdropElement.style.height = '100%';
        backdropElement.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        backdropElement.style.zIndex = '9999';
        
        // Referenzen für spätere Verwendung speichern
        this.activePaymentContainer = tempContainer;
        this.activeBackdropElement = backdropElement;
        
        // Elemente zum DOM hinzufügen
        document.body.appendChild(backdropElement);
        document.body.appendChild(tempContainer);
        
        // Sicherstellen, dass der Betrag korrekt formatiert ist
        const amount = this.formatAmount(orderDetails.total);

        // PayPal-Buttons rendern
        const buttonId = buttonContainer.id;
        const buttons = await window.paypal.Buttons({
          fundingSource: options?.fundingSource === 'card' ? window.paypal.FUNDING.CARD : window.paypal.FUNDING.PAYPAL,
          style: {
            layout: 'vertical',
            color: options?.fundingSource === 'card' ? 'black' : 'blue',
            shape: 'rect',
            label: options?.fundingSource === 'card' ? 'pay' : 'paypal',
            // Größe auf 'large' setzen für bessere Sichtbarkeit
            size: 'large'
          },
          
          // Bestellung erstellen
          createOrder: (data, actions) => {
            return actions.order.create({
              purchase_units: [{
                description: 'CreateMyArt - KI-generierte Poster',
                amount: {
                  currency_code: 'EUR',
                  value: amount,
                  breakdown: {
                    item_total: {
                      currency_code: 'EUR',
                      value: amount
                    }
                  }
                },
                items: this.formatItems(orderDetails.items)
              }]
            });
          },
          
          // Zahlung genehmigt
          onApprove: async (data, actions) => {
            try {
              // Bestellung erfassen
              console.log("Versuche PayPal-Bestellung zu erfassen...");
              let captureResult;
              try {
                captureResult = await actions.order.capture();
                console.log('Zahlung erfolgreich:', captureResult);
                
                // Nach erfolgreicher Erfassung Container sofort entfernen
                this._cleanupExistingContainers();
                this.paymentInProgress = false;
                
                // Zahlungsdetails für die weitere Verarbeitung
                const paymentDetails = {
                  success: true,
                  paymentId: captureResult.id,
                  payerId: captureResult.payer.payer_id,
                  payerEmail: captureResult.payer.email_address,
                  status: captureResult.status,
                  captureId: captureResult.purchase_units[0].payments.captures[0].id,
                  transactionId: captureResult.purchase_units[0].payments.captures[0].id,
                  amount: captureResult.purchase_units[0].payments.captures[0].amount.value,
                  currency: captureResult.purchase_units[0].payments.captures[0].amount.currency_code,
                  paymentMethod: 'paypal',
                  paymentProvider: 'PayPal',
                  timestamp: new Date().toISOString(),
                  rawResponse: captureResult
                };
                
                // Callback aufrufen
                if (typeof onApprove === 'function') {
                  onApprove(paymentDetails);
                }
                
                resolve(paymentDetails);
                return;
              } catch (captureError) {
                console.error('Fehler bei der Erfassung der PayPal-Bestellung:', captureError);
                
                // Container entfernen
                this._cleanupExistingContainers();
                this.paymentInProgress = false;
                
                // Benutzerfreundliche Fehlerbehandlung
                if (captureError.message && captureError.message.includes('window is closed')) {
                  const cancelError = new Error('Das PayPal-Fenster wurde geschlossen. Bitte versuchen Sie es erneut.');
                  
                  // Abbruch wie ein Cancel behandeln
                  if (typeof onCancel === 'function') {
                    onCancel({ cancelled: true, reason: 'window_closed' });
                  }
                  
                  resolve({
                    success: false,
                    cancelled: true,
                    error: 'Das PayPal-Fenster wurde vom Benutzer geschlossen'
                  });
                  return;
                }
                
                // Sonstigen Fehler an Error-Handler übergeben
                if (typeof onError === 'function') {
                  onError(captureError);
                }
                
                resolve({
                  success: false,
                  error: captureError.message || 'Fehler bei der PayPal-Zahlung'
                });
                return;
              }
              
            } catch (error) {
              // Container entfernen
              this._cleanupExistingContainers();
              this.paymentInProgress = false;
              
              console.error('Fehler bei der Zahlungserfassung:', error);
              
              // Spezielle Behandlung für geschlossene Fenster
              if (error.message && error.message.includes('window is closed')) {
                if (typeof onCancel === 'function') {
                  onCancel({ cancelled: true, reason: 'window_closed' });
                }
                
                resolve({
                  success: false,
                  cancelled: true,
                  error: 'Das PayPal-Fenster wurde vom Benutzer geschlossen'
                });
                return;
              }
              
              // Fehler-Callback aufrufen für andere Fehler
              if (typeof onError === 'function') {
                onError(error);
              }
              
              resolve({
                success: false,
                error: error.message || 'Fehler bei der Zahlungserfassung'
              });
            }
          },
          
          // Zahlung abgebrochen
          onCancel: (data) => {
            // Container entfernen
            this._cleanupExistingContainers();
            this.paymentInProgress = false;
            
            console.log('Zahlung abgebrochen:', data);
            
            // Abbruch-Callback aufrufen
            if (typeof onCancel === 'function') {
              onCancel(data);
            }
            
            resolve({
              success: false,
              cancelled: true,
              error: 'Zahlung wurde abgebrochen'
            });
          },
          
          // Fehler bei der Zahlung
          onError: (error) => {
            // Container entfernen
            this._cleanupExistingContainers();
            this.paymentInProgress = false;
            
            console.error('Fehler bei der PayPal-Zahlung:', error);
            
            // Fehler-Callback aufrufen
            if (typeof onError === 'function') {
              onError(error);
            }
            
            resolve({
              success: false,
              error: error.message || 'Fehler bei der PayPal-Zahlung'
            });
          }
        });
        
        // PayPal-Buttons rendern
        await buttons.render('#' + buttonId);
        
        // Den Button automatisch klicken, sobald er gerendert wurde
        // Dies ist eine Optimierung, die automatisch den PayPal-Fluss startet
        setTimeout(() => {
          try {
            // Den Text nicht mehr aktualisieren, da wir bereits eine klare Anweisung haben
            
            // Aktiv auf den PayPal-Button hinweisen (dezentere Hervorhebung)
            const paypalButtonElem = document.querySelector('#' + buttonId + ' .paypal-button');
            if (paypalButtonElem) {
              // Dezentere Hervorhebung
              paypalButtonElem.style.boxShadow = '0 0 5px 2px rgba(0, 112, 186, 0.2)';
              paypalButtonElem.style.animation = 'none'; // Keine Pulsation
              
              // Versuchen, automatisch den PayPal-Button anzuklicken
              // Dies funktioniert möglicherweise nicht in allen Browsern aufgrund von Sicherheitseinschränkungen
              try {
                console.log('Versuche, den PayPal-Button automatisch zu klicken...');
                setTimeout(() => {
                  paypalButtonElem.click();
                }, 1000);
              } catch (clickErr) {
                console.log('Automatischer Klick nicht möglich. Benutzer muss manuell klicken.', clickErr);
              }
            }
          } catch (uiErr) {
            console.log('Fehler beim Aktualisieren der UI:', uiErr);
          }
        }, 1500);
        
      } catch (error) {
        console.error('Fehler beim Öffnen des PayPal-Checkout-Fensters:', error);
        
        // Aufräumen im Fehlerfall
        this._cleanupExistingContainers();
        this.paymentInProgress = false;
        
        // Fehler-Callback aufrufen
        if (typeof onError === 'function') {
          onError(error);
        }
        
        reject({
          success: false,
          error: error.message || 'Fehler beim Öffnen des PayPal-Checkout-Fensters'
        });
      }
    });
  }
}

// Singleton-Instanz erstellen
const paypalIntegration = new PayPalIntegration();

// Exportiere die PayPal-Integration
export { paypalIntegration }; 