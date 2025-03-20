/**
 * Checkout-Funktionalität für CreateMyArt
 * Diese Datei handhabt den Checkout-Prozess und speichert Bestellungen in Firebase
 */

// Importiere Firebase-API
import { FirebaseAPI } from "./firebase-integration.js";
// Importiere PayPal-Integration
import { paypalIntegration } from "./paypal-integration.js";

/**
 * Checkout-Klasse zur Verwaltung des Bestellprozesses
 */
class Checkout {
  constructor() {
    this.cart = []; // Warenkorb
    this.customer = {}; // Kundendaten
    this.payment = {}; // Zahlungsdaten
    this.bindEvents();
  }

  /**
   * Bindet alle notwendigen Event-Listener
   */
  bindEvents() {
    // Formular-Listener für Checkout
    const checkoutForm = document.getElementById('checkout-form');
    if (checkoutForm) {
      checkoutForm.addEventListener('submit', this.handleSubmit.bind(this));
      
      // Event-Listener für Pflichtfelder
      const requiredFields = checkoutForm.querySelectorAll('[required]');
      requiredFields.forEach(field => {
        field.addEventListener('input', function() {
          // Entferne Fehlerstatus bei Eingabe
          this.classList.remove('field-error');
        });
      });
    }

    // Zahlungsarten-Listener
    const paymentOptions = document.querySelectorAll('input[name="payment-method"]');
    if (paymentOptions.length > 0) {
      paymentOptions.forEach(option => {
        option.addEventListener('change', this.updatePaymentMethod.bind(this));
      });
    }
  }

  /**
   * Aktualisiert den Warenkorb
   * @param {Array} cartItems - Die Warenkorbartikel
   */
  updateCart(cartItems) {
    this.cart = cartItems;
  }

  /**
   * Aktualisiert die Kundendaten
   * @param {Object} customerData - Die Kundendaten
   */
  updateCustomer(customerData) {
    this.customer = customerData;
  }

  /**
   * Berechnet die Gesamtsumme des Warenkorbs
   * @returns {number} Die Gesamtsumme
   */
  calculateTotal() {
    if (!this.cart || this.cart.length === 0) {
      return 0;
    }
    
    return this.cart.reduce((total, item) => {
      // Sicherstellen, dass der Preis eine Zahl ist
      const itemPrice = typeof item.price === 'number' ? item.price : parseFloat(item.price) || 0;
      return total + itemPrice;
    }, 0);
  }

  /**
   * Zeigt das Loading-Overlay mit einer Nachricht an
   * @param {string} message - Die anzuzeigende Nachricht
   */
  showLoadingOverlay(message = 'Bitte warten...') {
    const loadingOverlay = document.getElementById('loading-overlay');
    
    if (loadingOverlay) {
      // Prüfen, ob ein Message-Element existiert, sonst das vorhandene p-Element verwenden
      const loadingMessage = document.getElementById('loading-message') || loadingOverlay.querySelector('p');
      
      if (loadingMessage) {
        loadingMessage.textContent = message;
      }
      
      loadingOverlay.style.display = 'flex';
    }
  }
  
  /**
   * Verbirgt das Loading-Overlay
   */
  hideLoadingOverlay() {
    const loadingOverlay = document.getElementById('loading-overlay');
    
    if (loadingOverlay) {
      loadingOverlay.style.display = 'none';
    }
  }

  /**
   * Aktualisiert die Zahlungsmethode basierend auf verschiedenen Event-Formaten
   * @param {Event|string|Object} event - Das Event-Objekt oder ein String/Objekt mit der Zahlungsmethode
   */
  updatePaymentMethod(event) {
    let paymentMethod = null;
    
    // Verschiedene mögliche Event-Formate prüfen
    if (event?.target?.value) {
      // Standard-Event-Format
      paymentMethod = event.target.value;
    } else if (typeof event === 'string') {
      // Direkter String wurde übergeben
      paymentMethod = event;
    } else if (event?.detail?.paymentMethod) {
      // CustomEvent mit paymentMethod im detail
      paymentMethod = event.detail.paymentMethod;
    } else if (event?.paymentMethod) {
      // Objekt mit direkter paymentMethod-Eigenschaft
      paymentMethod = event.paymentMethod;
    }
    
    // Wenn keine Methode gefunden wurde, versuche einen Fallback
    if (!paymentMethod) {
      // Prüfe, ob eine Zahlungsmethode ausgewählt ist
      const selectedMethod = document.querySelector('input[name="payment-method"]:checked');
      if (selectedMethod) {
        paymentMethod = selectedMethod.value;
      } else {
        return; // Abbrechen, wenn keine Methode gefunden
      }
    }
    
    // Fehlermeldung für Zahlungsmethode entfernen
    const errorElement = document.getElementById('error-message');
    if (errorElement) {
      errorElement.style.display = 'none';
    }
    
    // Auch die rote Markierung des Containers entfernen
    const paymentContainer = document.querySelector('.payment-options');
    if (paymentContainer) {
      paymentContainer.classList.remove('validation-error');
    }
    
    // Zahlungsmethode speichern
    this.payment = {
      method: paymentMethod,
      // Je nach Zahlungsmethode unterschiedliche Details setzen
      details: this.getPaymentDetails(paymentMethod)
    };

    // PayPal-Button-Container ausblenden (wir zeigen keine Buttons mehr direkt an)
    const paypalButtonContainer = document.getElementById('paypal-button-container');
    if (paypalButtonContainer) {
      paypalButtonContainer.style.display = 'none';
    }
  }
  
  // Zahlungsdetails basierend auf der Methode zurückgeben
  getPaymentDetails(method) {
    switch(method) {
      case 'paypal':
        return { type: 'paypal' };
      
      case 'credit-card':
        return { type: 'credit-card', provider: 'paypal' };
      
      case 'stripe':
        return { type: 'stripe' };
      
      default:
        return {};
    }
  }

  /**
   * Rendert die PayPal-Buttons im Container
   */
  async renderPayPalButtons() {
    try {
      // Warenkorb aus localStorage laden
      const cartItems = JSON.parse(localStorage.getItem('cart') || '[]');
      this.updateCart(cartItems);
      
      // Gesamtbetrag berechnen
      const total = this.calculateTotal();
      
      // Bestelldetails für PayPal
      const orderDetails = {
        items: this.cart,
        total: total
      };
      
      // PayPal-Buttons rendern
      await paypalIntegration.renderPayPalButtons(
        'paypal-button-container',
        orderDetails,
        // Erfolgreiche Zahlung
        async (paymentDetails) => {
          try {
            console.log('PayPal-Zahlung erfolgreich:', paymentDetails);
            
            // Formular validieren
            if (!this.validateForm()) {
              return;
            }
            
            // Bestellung in Firebase speichern
            await this.saveOrder(paymentDetails);
          } catch (error) {
            console.error('Fehler bei der Verarbeitung der PayPal-Zahlung:', error);
            this.showError('Ein Fehler ist aufgetreten. Bitte versuchen Sie es später erneut.');
          }
        },
        // Abgebrochene Zahlung
        () => {
          console.log('PayPal-Zahlung abgebrochen');
          this.showError('Die Zahlung wurde abgebrochen.');
        },
        // Fehler bei der Zahlung
        (error) => {
          console.error('Fehler bei der PayPal-Zahlung:', error);
          this.showError('Bei der Zahlung ist ein Fehler aufgetreten. Bitte versuchen Sie es später erneut.');
        }
      );
    } catch (error) {
      console.error('Fehler beim Rendern der PayPal-Buttons:', error);
    }
  }

  // Formular-Abgabe verarbeiten
  async handleSubmit(event) {
    event.preventDefault();
    
    try {
      // Validiere Formular
      if (!this.validateForm()) {
        return;
      }
      
      // Je nach Zahlungsmethode unterschiedlich verarbeiten
      if (this.payment.method === 'paypal' || this.payment.method === 'credit-card') {
        // Bei PayPal und Kreditkarte den direkten Checkout über processPayPalPayment starten
        this.showLoadingOverlay(this.payment.method === 'paypal' ? 
          'Verbindung zu PayPal wird hergestellt...' : 
          'Verbindung zum Kreditkarten-Service wird hergestellt...');
        
        // Warenkorb aus localStorage laden
        const cartItems = JSON.parse(localStorage.getItem('cart') || '[]');
        this.updateCart(cartItems);
        
        // Gesamtbetrag berechnen
        const total = this.calculateTotal();
        
        // Bestelldetails für PayPal/Kreditkarte
        const orderDetails = {
          items: this.cart,
          total: total
        };
        
        // Parameter für die PayPal-Integration
        const paypalParams = {
          // Bei Kreditkarte FUNDING.CARD verwenden, ansonsten FUNDING.PAYPAL
          fundingSource: this.payment.method === 'credit-card' ? 'card' : undefined
        };

        // PayPal-Zahlung oder Kreditkartenzahlung über PayPal starten
        const paymentResult = await paypalIntegration.processDirectPayment(
          orderDetails,
          async (paymentDetails) => {
            try {
              // Zahlungsmethode in den Zahlungsdetails anpassen
              if (this.payment.method === 'credit-card') {
                paymentDetails.paymentMethod = 'credit-card';
                paymentDetails.paymentProvider = 'PayPal (Kreditkarte)';
              }
              
              // Bestellung in Firebase speichern
              await this.saveOrder(paymentDetails);
            } catch (error) {
              console.error('Fehler bei der Verarbeitung der Zahlung:', error);
              this.showError('Ein Fehler ist aufgetreten. Bitte versuchen Sie es später erneut.');
            } finally {
              this.hideLoadingOverlay();
            }
          },
          () => {
            // Abbruch-Handler
            this.hideLoadingOverlay();
            this.showError('Die Zahlung wurde abgebrochen.');
          },
          (error) => {
            // Fehler-Handler
            this.hideLoadingOverlay();
            this.showError('Bei der Zahlung ist ein Fehler aufgetreten. Bitte versuchen Sie es später erneut.');
          },
          paypalParams
        );
        
        return;
      } else {
        // Andere Zahlungsmethoden (falls vorhanden)
        const paymentResult = await this.processPayment();
        
        if (!paymentResult.success) {
          this.showError(paymentResult.error || 'Fehler bei der Zahlungsverarbeitung');
          return;
        }
        
        // Bestellung in Firebase speichern
        await this.saveOrder(paymentResult);
      }
      
    } catch (error) {
      console.error('Fehler beim Checkout:', error);
      this.showError('Ein unerwarteter Fehler ist aufgetreten. Bitte versuchen Sie es später erneut.');
      this.hideLoadingOverlay();
    }
  }

  // Validiert das Formular
  validateForm() {
    // Sammle fehlende Pflichtfelder und deren DOM-Elemente
    const missingFields = [];
    const missingElements = [];
    let hasErrors = false;
    
    // Zurücksetzen aller vorherigen Fehlermarkierungen
    document.querySelectorAll('.field-error').forEach(el => {
      el.classList.remove('field-error');
    });
    document.querySelector('.payment-options')?.classList.remove('validation-error');
    
    // Prüfen, ob Kundendaten vorhanden sind
    const firstNameField = document.getElementById('checkout-firstname');
    const lastNameField = document.getElementById('checkout-lastname');
    const emailField = document.getElementById('checkout-email');
    const streetField = document.getElementById('checkout-street');
    const houseNumberField = document.getElementById('checkout-house-number');
    const zipField = document.getElementById('checkout-zip');
    const cityField = document.getElementById('checkout-city');
    const paymentMethod = document.querySelector('input[name="payment-method"]:checked');
    const termsCheckbox = document.getElementById('terms-checkbox');
    
    // Protokolliere die Werte der Felder
    console.log("Formularwerte:", {
      firstName: firstNameField ? firstNameField.value : 'nicht gefunden',
      lastName: lastNameField ? lastNameField.value : 'nicht gefunden',
      email: emailField ? emailField.value : 'nicht gefunden',
      street: streetField ? streetField.value : 'nicht gefunden',
      houseNumber: houseNumberField ? houseNumberField.value : 'nicht gefunden',
      zip: zipField ? zipField.value : 'nicht gefunden',
      city: cityField ? cityField.value : 'nicht gefunden',
      paymentChecked: paymentMethod ? paymentMethod.value : 'keine ausgewählt',
      termsChecked: termsCheckbox ? termsCheckbox.checked : 'nicht gefunden'
    });
    
    // Vorname validieren
    if (!firstNameField || !firstNameField.value.trim()) {
      console.log("Fehlendes Pflichtfeld: Vorname");
      missingFields.push('Vorname');
      if (firstNameField) {
        missingElements.push(firstNameField);
        firstNameField.classList.add('field-error');
      }
      hasErrors = true;
    } else {
      this.customer.firstName = firstNameField.value.trim();
    }
    
    // Nachname validieren
    if (!lastNameField || !lastNameField.value.trim()) {
      console.log("Fehlendes Pflichtfeld: Nachname");
      missingFields.push('Nachname');
      if (lastNameField) {
        missingElements.push(lastNameField);
        lastNameField.classList.add('field-error');
      }
      hasErrors = true;
    } else {
      this.customer.lastName = lastNameField.value.trim();
      // Vollständigen Namen zusammensetzen
      this.customer.name = `${this.customer.firstName} ${this.customer.lastName}`;
    }
    
    // E-Mail validieren
    if (!emailField || !emailField.value.trim()) {
      console.log("Fehlendes Pflichtfeld: E-Mail");
      missingFields.push('E-Mail');
      if (emailField) {
        missingElements.push(emailField);
        emailField.classList.add('field-error');
      }
      hasErrors = true;
    } else {
      // Einfache E-Mail-Validierung
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(emailField.value.trim())) {
        console.log("Ungültige E-Mail-Adresse");
        missingFields.push('E-Mail (ungültiges Format)');
        missingElements.push(emailField);
        emailField.classList.add('field-error');
        hasErrors = true;
      } else {
        this.customer.email = emailField.value.trim();
      }
    }
    
    // Straße validieren
    if (!streetField || !streetField.value.trim()) {
      console.log("Fehlendes Pflichtfeld: Straße");
      missingFields.push('Straße');
      if (streetField) {
        missingElements.push(streetField);
        streetField.classList.add('field-error');
      }
      hasErrors = true;
    } else {
      this.customer.street = streetField.value.trim();
    }
    
    // Hausnummer validieren
    if (!houseNumberField || !houseNumberField.value.trim()) {
      console.log("Fehlendes Pflichtfeld: Hausnummer");
      missingFields.push('Hausnummer');
      if (houseNumberField) {
        missingElements.push(houseNumberField);
        houseNumberField.classList.add('field-error');
      }
      hasErrors = true;
    } else {
      this.customer.houseNumber = houseNumberField.value.trim();
    }
    
    // PLZ validieren
    if (!zipField || !zipField.value.trim()) {
      console.log("Fehlendes Pflichtfeld: PLZ");
      missingFields.push('PLZ');
      if (zipField) {
        missingElements.push(zipField);
        zipField.classList.add('field-error');
      }
      hasErrors = true;
    } else {
      this.customer.zip = zipField.value.trim();
    }
    
    // Ort validieren
    if (!cityField || !cityField.value.trim()) {
      console.log("Fehlendes Pflichtfeld: Ort");
      missingFields.push('Ort');
      if (cityField) {
        missingElements.push(cityField);
        cityField.classList.add('field-error');
      }
      hasErrors = true;
    } else {
      this.customer.city = cityField.value.trim();
    }
    
    // Vollständige Adresse zusammensetzen
    if (this.customer.street && this.customer.houseNumber && this.customer.zip && this.customer.city) {
      this.customer.address = `${this.customer.street} ${this.customer.houseNumber}`;
      this.customer.fullAddress = `${this.customer.street} ${this.customer.houseNumber}, ${this.customer.zip} ${this.customer.city}`;
    }
    
    // Prüfen, ob Zahlungsmethode ausgewählt wurde
    if (!paymentMethod) {
      console.log("Fehlendes Pflichtfeld: Zahlungsmethode");
      missingFields.push('Zahlungsmethode');
      const paymentContainer = document.querySelector('.payment-options');
      if (paymentContainer) {
        missingElements.push(paymentContainer);
        // Deutlichere Hervorhebung der fehlenden Zahlungsmethode
        paymentContainer.classList.add('validation-error');
      }
      hasErrors = true;
    } else {
      // Sicherstellen, dass die Zahlungsmethode im this.payment-Objekt gesetzt ist
      this.updatePaymentMethod({ target: paymentMethod });
    }
    
    // Prüfen, ob AGB akzeptiert wurden
    if (!termsCheckbox || !termsCheckbox.checked) {
      console.log("Fehlendes Pflichtfeld: AGB-Akzeptanz");
      missingFields.push('AGB-Zustimmung');
      if (termsCheckbox && termsCheckbox.parentNode) {
        missingElements.push(termsCheckbox.parentNode);
        termsCheckbox.parentNode.classList.add('field-error');
        hasErrors = true;
      }
    }
    
    // Prüfen, ob Warenkorb Artikel enthält
    const cartItems = JSON.parse(localStorage.getItem('cart') || '[]');
    
    if (cartItems.length === 0) {
      console.log("Warenkorb ist leer");
      alert("Ihr Warenkorb ist leer. Bitte fügen Sie Artikel hinzu, bevor Sie fortfahren.");
      return false;
    }
    
    // Warenkorb aus dem lokalen Speicher laden
    this.updateCart(cartItems);
    
    if (hasErrors) {
      console.log("Validierungsfehler:", missingFields);
      
      // Fehlermeldung nicht mehr als Alert anzeigen
      // Nur zum ersten fehlenden Feld scrollen
      if (missingElements.length > 0 && missingElements[0]) {
        missingElements[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
        if (missingElements[0].focus && typeof missingElements[0].focus === 'function') {
          missingElements[0].focus();
        }
      }
      return false;
    }
    
    console.log("Formular ist gültig");
    console.log("Kundendaten nach Validierung:", this.customer);
    console.log("Zahlungsmethode nach Validierung:", this.payment);
    console.log("Warenkorb nach Validierung:", this.cart);
    
    return true;
  }
  
  // Verarbeitet die Zahlung je nach gewählter Methode
  async processPayment() {
    try {
      const paymentMethod = this.payment.method;
      
      switch(paymentMethod) {
        case 'paypal':
          // PayPal-Integration verwenden
          // Hinweis: Bei PayPal wird die Zahlung bereits durch die Buttons verarbeitet
          // Hier geben wir nur ein Erfolgs-Objekt zurück, da die eigentliche Zahlung
          // über die PayPal-Buttons erfolgt
          return { 
            success: true, 
            paymentId: 'paypal_redirect_' + Date.now(),
            info: 'PayPal-Zahlung wird über die PayPal-Buttons abgewickelt'
          };
        
        case 'credit-card':
          // Kreditkartenzahlung wird ebenfalls über PayPal abgewickelt
          return { 
            success: true, 
            paymentId: 'credit_card_paypal_' + Date.now(),
            info: 'Kreditkartenzahlung wird über PayPal abgewickelt'
          };
        
        default:
          throw new Error('Nicht unterstützte Zahlungsmethode');
      }
    } catch (error) {
      console.error('Fehler bei der Zahlungsverarbeitung:', error);
      return { success: false, error: 'Zahlungsverarbeitung fehlgeschlagen' };
    }
  }
  
  // Bestellung speichern
  async saveOrder(paymentResult) {
    try {
      console.log('Starte Bestellspeicherung...');
      
      // Validiere den Warenkorb
      if (!this.cart || this.cart.length === 0) {
        console.error('Warenkorb ist leer oder ungültig');
        return {
          success: false,
          error: 'Warenkorb ist leer oder ungültig'
        };
      }

      // Prüfe Kundendaten
      if (!this.customer || !this.customer.name || !this.customer.email) {
        console.error('Kundendaten unvollständig');
        return {
          success: false,
          error: 'Kundendaten unvollständig'
        };
      }

      console.log('Warenkorb validiert:', this.cart);
      console.log('Kundendaten validiert:', this.customer);

      // Zahlung validieren
      if (!paymentResult || !paymentResult.success) {
        console.error('Zahlung nicht erfolgreich');
        return {
          success: false,
          error: 'Zahlung nicht erfolgreich'
        };
      }

      console.log('Zahlung validiert:', paymentResult);

      // Bestellung vorbereiten
      const orderData = {
        customer: this.customer,
        items: this.cart.map(item => {
          // Sicherstellen, dass jedes Item seine Größe behält
          return {
            ...item,
            size: item.size || "Standard",
            productName: item.name || item.title || 'KI-generiertes Bild'
          };
        }),
        total: this.calculateTotal(),
        paymentMethod: this.payment.method,
        paymentDetails: paymentResult,
        status: 'bezahlt',
        imageUrls: [], // Array für hochgeladene Bild-URLs
        createdAt: new Date().toISOString()
      };

      // Loading-Overlay anzeigen
      this.showLoadingOverlay('Bestellung wird gespeichert...');

      // Bestellung in Firestore speichern
      console.log('Speichere Bestellung in Firestore:', orderData);
      const orderResult = await FirebaseAPI.saveOrderToFirestore(orderData);
      
      if (orderResult.success) {
        console.log('Bestellung erfolgreich gespeichert mit ID:', orderResult.orderId);
        
        // Bilder in Firebase Storage speichern
        const uploadedImageUrls = [];
        const uploadedImageDetails = []; // Neue Array für Bildobjekte mit Details
        
        try {
          // Für jedes Bestellelement prüfen, ob ein Bild vorhanden ist
          for (const item of this.cart) {
            // Prüfe sowohl auf imageUrl als auch auf url Feld (aus dem Warenkorb)
            const imageUrlToUse = item.imageUrl || item.url;
            
            if (imageUrlToUse) {
              console.log('Speichere Bild für Bestellposition:', item.name || item.title, 'URL:', imageUrlToUse, 'Größe:', item.size);
              
              // Datei nur speichern, wenn es sich um ein Daten-URL oder eine Web-URL handelt
              if (imageUrlToUse.startsWith('data:') || imageUrlToUse.startsWith('http')) {
                // Größeninformation mit übergeben
                const imageResult = await FirebaseAPI.saveImageToStorage(imageUrlToUse, orderResult.orderId, item.size);
                
                if (imageResult.success) {
                  console.log('Bild erfolgreich gespeichert:', imageResult.url, 'Größe:', imageResult.size);
                  uploadedImageUrls.push(imageResult.url);
                  
                  // Detaillierte Bildinformationen speichern, jetzt auch mit eindeutiger Produkt-ID
                  uploadedImageDetails.push({
                    url: imageResult.url,
                    path: imageResult.path,
                    size: item.size || "Standard",
                    productName: item.name || item.title || 'KI-generiertes Bild',
                    prompt: item.prompt || '',
                    productId: item.id || imageResult.path, // Eindeutige ID für Produkt
                    imageId: item.imageId || '',           // Bild-ID, falls vorhanden
                    originalItem: { ...item }              // Original-Item-Daten zur Referenz
                  });
                  
                  // Wir aktualisieren die Bestellung nicht mehr mit den Bild-URLs, da dies zu Berechtigungsfehlern führen kann
                  // Stattdessen verlassen wir uns darauf, dass die ursprünglichen Bild-URLs direkt in den E-Mails verwendet werden
                } else {
                  console.error('Fehler beim Speichern des Bildes:', imageResult.error);
                }
              } else {
                console.warn('Ungültiges Bildformat, überspringen:', imageUrlToUse);
              }
            }
          }
          
          // Versuche, die Bestellung mit den Bild-Details zu aktualisieren
          try {
            if (uploadedImageDetails.length > 0 && FirebaseAPI.updateOrderImageUrls) {
              const updateResult = await FirebaseAPI.updateOrderImageUrls(orderResult.orderId, uploadedImageDetails);
              if (updateResult.success) {
                console.log('Bestellung erfolgreich mit Bilddetails aktualisiert');
              } else {
                console.error('Fehler beim Aktualisieren der Bestellung mit Bilddetails:', updateResult.error);
              }
            }
          } catch (updateError) {
            console.error('Fehler beim Aktualisieren der Bestellung (nicht kritisch):', updateError);
          }
          
        } catch (imageError) {
          // Fehler beim Bildupload loggen, aber Bestellung trotzdem als erfolgreich werten
          console.error('Fehler beim Speichern der Bilder:', imageError);
        }
        
        // Warenkorb leeren
        localStorage.removeItem('cart');
        this.cart = [];
        
        // Versuche, E-Mails mit den hochgeladenen Bild-URLs zu senden
        try {
          if (FirebaseAPI.sendOrderConfirmationEmail) {
            await FirebaseAPI.sendOrderConfirmationEmail(orderResult.orderId, orderData, uploadedImageDetails.length > 0 ? uploadedImageDetails : uploadedImageUrls);
          }
        } catch (emailError) {
          console.error('Fehler beim Senden der E-Mail (nicht kritisch):', emailError);
        }
        
        // Loading-Overlay ausblenden
        this.hideLoadingOverlay();
        
        // Bestellbestätigung anzeigen
        this.showOrderConfirmation(orderResult.orderId);
        
        // Event triggern
        window.dispatchEvent(new CustomEvent('orderCompleted', {
          detail: {
            orderId: orderResult.orderId,
            imageUrls: uploadedImageUrls,
            imageDetails: uploadedImageDetails, // Detaillierte Bildinformationen übergeben
            order: {
              items: orderData.items, // Original-Bestellpositionen für Referenz
              customer: orderData.customer,
              total: orderData.total
            }
          }
        }));
        
        // Erfolgreich
        return {
          success: true,
          orderId: orderResult.orderId
        };
      } else {
        console.error('Fehler beim Speichern der Bestellung:', orderResult.error);
        
        // Loading-Overlay ausblenden
        this.hideLoadingOverlay();
        
        return {
          success: false,
          error: orderResult.error || 'Unbekannter Fehler beim Speichern der Bestellung'
        };
      }
    } catch (error) {
      console.error('Fehler beim Speichern der Bestellung:', error);
      
      // Loading-Overlay ausblenden
      this.hideLoadingOverlay();
      
      // Fehlermeldung anzeigen
      this.showError('Die Bestellung konnte nicht gespeichert werden: ' + error.message);
      return { success: false, error: error.message };
    }
  }
  
  // Bestellbestätigung anzeigen
  showOrderConfirmation(orderId) {
    console.log("Zeige Bestellbestätigung für Order ID:", orderId);
    
    try {
      // Lade-Overlay ausblenden
      const loadingOverlay = document.getElementById('loading-overlay');
      if (loadingOverlay) {
        loadingOverlay.style.display = 'none';
      }
      
      // Checkout-Modal schließen, falls geöffnet
      const checkoutModal = document.getElementById('checkout-modal');
      if (checkoutModal) {
        checkoutModal.style.display = 'none';
      }
      
      // Falls wir auf der separaten Checkout-Seite sind, zurück zur Hauptseite und dort Modal anzeigen
      if (window.location.pathname.includes('checkout.html')) {
        localStorage.setItem('showOrderConfirmation', JSON.stringify({
          orderId: orderId,
          timestamp: new Date().getTime()
        }));
        window.location.href = 'index.html?confirmation=true';
        return;
      }
      
      // Wir sind auf der Hauptseite - Modal direkt anzeigen
      const confirmationModal = document.getElementById('confirmation-modal');
      const orderNumberElement = document.getElementById('order-number');
      
      if (!confirmationModal) {
        console.error("Bestätigungsmodal nicht gefunden");
        alert(`Bestellung erfolgreich! Deine Bestellnummer: #${orderId}`);
        return;
      }
      
      if (!orderNumberElement) {
        console.warn("Bestellnummerelement nicht gefunden");
      } else {
        orderNumberElement.textContent = `#${orderId}`;
      }
      
      // Modal anzeigen
      confirmationModal.style.display = 'block';
      
      // Event-Listener für "Weiter einkaufen"
      const continueShoppingBtn = document.getElementById('continue-shopping');
      if (continueShoppingBtn) {
        // Entferne vorhandene Event-Listener, um doppelte zu vermeiden
        const newBtn = continueShoppingBtn.cloneNode(true);
        continueShoppingBtn.parentNode.replaceChild(newBtn, continueShoppingBtn);
        
        newBtn.addEventListener('click', function() {
          confirmationModal.style.display = 'none';
          // Warenkorb-Sidebar schließen, falls geöffnet
          const cartSidebar = document.getElementById('cart-sidebar');
          const cartSidebarBackdrop = document.getElementById('cart-sidebar-backdrop');
          
          if (cartSidebar) cartSidebar.classList.remove('active');
          if (cartSidebarBackdrop) cartSidebarBackdrop.classList.remove('active');
          
          // Warenkorb neu laden
          window.dispatchEvent(new Event('updateCart'));
          if (window.updateCartUI) {
            window.updateCartUI();
          }
        });
      }
      
      // Schließen-Button im Modal
      const closeBtn = confirmationModal.querySelector('.close-modal');
      if (closeBtn) {
        // Entferne vorhandene Event-Listener, um doppelte zu vermeiden
        const newCloseBtn = closeBtn.cloneNode(true);
        closeBtn.parentNode.replaceChild(newCloseBtn, closeBtn);
        
        newCloseBtn.addEventListener('click', function() {
          confirmationModal.style.display = 'none';
          
          // Warenkorb neu laden
          window.dispatchEvent(new Event('updateCart'));
          if (window.updateCartUI) {
            window.updateCartUI();
          }
        });
      }
    } catch (error) {
      console.error("Fehler beim Anzeigen der Bestellbestätigung:", error);
      // Fallback, damit der Kunde zumindest eine Bestätigung erhält
      alert(`Bestellung erfolgreich! Deine Bestellnummer: #${orderId}`);
    }
  }
  
  // Fehlermeldung anzeigen
  showError(message) {
    console.error("Fehler beim Checkout:", message);
    
    try {
      // Prüfen, ob eine globale Funktion zur Anzeige von Fehlern existiert
      if (typeof window.showCustomAlert === 'function') {
        window.showCustomAlert(message, 'Fehler');
        return;
      }
      
      // Eigenes Modal für Fehlermeldungen verwenden
      const alertModal = document.getElementById('custom-alert-modal');
      const alertTitle = document.getElementById('custom-alert-title');
      const alertMessage = document.getElementById('custom-alert-message');
      const alertButton = document.getElementById('custom-alert-button');
      
      if (alertModal && alertMessage) {
        // Modal mit dem Fehler befüllen
        alertMessage.textContent = message;
        if (alertTitle) alertTitle.textContent = 'Fehler';
        
        // Modal anzeigen
        alertModal.style.display = 'block';
        
        // Event-Listener für Button zum Schließen
        if (alertButton) {
          // Entferne vorhandene Event-Listener, um doppelte zu vermeiden
          const newBtn = alertButton.cloneNode(true);
          alertButton.parentNode.replaceChild(newBtn, alertButton);
          
          newBtn.addEventListener('click', function() {
            alertModal.style.display = 'none';
          });
        }
        
        // Event-Listener für Schließen-Button
        const closeBtn = alertModal.querySelector('.close-modal');
        if (closeBtn) {
          // Entferne vorhandene Event-Listener, um doppelte zu vermeiden
          const newCloseBtn = closeBtn.cloneNode(true);
          closeBtn.parentNode.replaceChild(newCloseBtn, closeBtn);
          
          newCloseBtn.addEventListener('click', function() {
            alertModal.style.display = 'none';
          });
        }
      } else {
        // Fallback auf Standard-Alert
        alert(message);
      }
    } catch (error) {
      console.error("Fehler beim Anzeigen der Fehlermeldung:", error);
      // Fallback auf Standard-Alert
      alert(message);
    }
  }
}

// Exportiere die Checkout-Klasse
export default Checkout;

// Erstelle eine Instanz für die globale Verwendung
const checkout = new Checkout();
export { checkout }; 