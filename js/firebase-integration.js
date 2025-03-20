/**
 * Firebase Integration für CreateMyArt
 * Diese Datei enthält die Firebase-Datenbankintegration für Bestellungen ohne Benutzerregistrierung
 */

// Firebase-Module importieren
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, query, where, orderBy, Timestamp, doc, updateDoc } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-storage.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-analytics.js";
import { loadEnvironmentVariables, getEnv } from "./env-loader.js";

// Firebase-App und Dienste
let app, db, storage, analytics;
let isInitialized = false;
let environmentLoaded = false;

/**
 * Initialisiert Firebase mit den Umgebungsvariablen
 * @returns {Promise<boolean>} - True wenn erfolgreich, sonst False
 */
async function initializeFirebase() {
  // Wenn bereits initialisiert, nichts tun
  if (isInitialized && app && db && storage) {
    return true;
  }
  
  try {
    // Umgebungsvariablen laden, falls noch nicht geschehen
    if (!environmentLoaded) {
      await loadEnvironmentVariables();
      environmentLoaded = true;
    }
    
    // Firebase-Konfiguration aus Umgebungsvariablen
    const firebaseConfig = {
      apiKey: getEnv('FIREBASE_API_KEY'),
      authDomain: getEnv('FIREBASE_AUTH_DOMAIN'),
      projectId: getEnv('FIREBASE_PROJECT_ID'),
      storageBucket: getEnv('FIREBASE_STORAGE_BUCKET'),
      messagingSenderId: getEnv('FIREBASE_MESSAGING_SENDER_ID'),
      appId: getEnv('FIREBASE_APP_ID'),
      measurementId: getEnv('FIREBASE_MEASUREMENT_ID')
    };
    
    // Prüfen, ob die Konfiguration gültig ist
    if (!firebaseConfig.apiKey) {
      console.error('Firebase API-Schlüssel fehlt in der Konfiguration');
      return false;
    }
    
    // Firebase-App initialisieren
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    storage = getStorage(app);
    analytics = getAnalytics(app);
    
    isInitialized = true;
    return true;
  } catch (error) {
    console.error('Fehler bei der Firebase-Initialisierung:', error);
    isInitialized = false;
    return false;
  }
}

/**
 * Speichert eine Bestellung in Firestore
 * @param {Object} orderData - Die zu speichernden Bestelldaten
 * @returns {Promise<Object>} - Erfolg/Fehler-Objekt mit Bestellungs-ID
 */
async function saveOrderToFirestore(orderData) {
  try {
    // Prüfen, ob Firebase initialisiert ist
    if (!db) {
      const initSuccess = await initializeFirebase();
      if (!initSuccess || !db) {
        return { 
          success: false, 
          error: "Firebase-Dienst nicht verfügbar. Bitte versuche es später erneut."
        };
      }
    }
    
    // Zeitstempel und Status hinzufügen
    orderData.timestamp = Timestamp.now();
    orderData.status = 'neu';
    
    // In Firestore speichern
    const ordersCollection = collection(db, "orders");
    const docRef = await addDoc(ordersCollection, orderData);
    
    // E-Mail-Benachrichtigung wird jetzt in der Checkout-Klasse gesendet,
    // nachdem die Bilder hochgeladen wurden
    
    return { 
      success: true,
      orderId: docRef.id
    };
  } catch (error) {
    console.error("Fehler beim Speichern der Bestellung:", error);
    return { 
      success: false, 
      error: error.message || "Unbekannter Fehler beim Speichern der Bestellung"
    };
  }
}

/**
 * Sendet eine Bestellbestätigungs-E-Mail
 * @param {string} orderId - Die Bestellungs-ID
 * @param {Object} orderData - Die Bestelldaten
 * @param {Array} uploadedImageData - Die hochgeladenen Bild-URLs oder Bilddetails
 * @returns {Promise<void>}
 */
async function sendOrderConfirmationEmail(orderId, orderData, uploadedImageData = []) {
  try {
    if (!db) {
      const initSuccess = await initializeFirebase();
      if (!initSuccess || !db) {
        console.error("Firebase-Dienst nicht verfügbar für E-Mail-Versand");
        return;
      }
    }
    
    // Administrator-E-Mail aus Umgebungsvariablen laden
    const adminEmail = getEnv('ADMIN_EMAIL') || "kontakt@create-my-art.de";
    
    // Verarbeite die Bilddaten - kann entweder einfache URLs oder komplexe Objekte sein
    const processedImageUrls = uploadedImageData.map(item => {
      if (typeof item === 'string') {
        return { url: item };
      }
      return item;
    });
    
    // HTML für Produkte in der Bestellung
    let productsHtml = '';
    
    if (orderData.items && orderData.items.length > 0) {
      productsHtml = '<table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">' +
        '<tr style="background-color: #f2f2f2;"><th style="padding: 10px; text-align: left;">Produkt</th><th style="padding: 10px; text-align: left;">Größe</th><th style="padding: 10px; text-align: right;">Preis</th></tr>';
      
      for (const item of orderData.items) {
        const itemName = item.name || item.title || 'KI-generiertes Poster';
        
        // Formatierung der Größe
        let formattedSize = item.size;
        if (item.size) {
          switch(item.size) {
            case '21x29.7': formattedSize = '21 x 29,70 cm'; break;
            case '29.7x42': formattedSize = '29,70 x 42 cm A3'; break;
            case '42x59.4': formattedSize = '42 x 59,40 cm A2'; break;
            case '50x70': formattedSize = '50 x 70 cm'; break;
            case '59.4x84.1': formattedSize = '59,40 x 84,10 cm A1'; break;
            case '84.1x118.9': formattedSize = '84,10 x 118,90 cm A0'; break;
            default: formattedSize = item.size;
          }
        }
        
        // Preis formatieren - in Cent zu Euro umrechnen und deutsches Format
        const itemPrice = typeof item.price === 'number' ? 
          (item.price / 100).toFixed(2).replace('.', ',') + ' €' : 
          (typeof item.price === 'string' ? item.price : '0,00 €');
        
        productsHtml += `<tr>
          <td style="padding: 10px; border-top: 1px solid #ddd;">${itemName}</td>
          <td style="padding: 10px; border-top: 1px solid #ddd;">${formattedSize}</td>
          <td style="padding: 10px; border-top: 1px solid #ddd; text-align: right;">${itemPrice}</td>
        </tr>`;
      }
      
      // Gesamtsumme hinzufügen - Umrechnung von Cent in Euro
      const total = typeof orderData.total === 'number' ? 
        (orderData.total / 100).toFixed(2).replace('.', ',') + ' €' : 
        (typeof orderData.total === 'string' ? orderData.total : '0,00 €');
        
      productsHtml += `<tr style="font-weight: bold;">
        <td style="padding: 10px; border-top: 1px solid #ddd;" colspan="2">Gesamtbetrag:</td>
        <td style="padding: 10px; border-top: 1px solid #ddd; text-align: right;">${total}</td>
      </tr>`;
      
      productsHtml += '</table>';
    }
    
    // Bilder-HTML für E-Mails vorbereiten
    let imagesHtml = '';
    
    // Wenn wir hochgeladene Bild-URLs haben, verwenden wir diese
    if (processedImageUrls && processedImageUrls.length > 0) {
      imagesHtml = '<h3 style="margin-top: 20px;">Dein bestelltes Poster</h3>';
      
      for (const imageData of processedImageUrls) {
        // Formatierter Größenname für die Anzeige
        let formattedSize = "";
        if (typeof imageData === 'object' && imageData.size) {
          switch(imageData.size) {
            case '21x29.7': formattedSize = '21 x 29,70 cm (A4)'; break;
            case '29.7x42': formattedSize = '29,70 x 42 cm (A3)'; break;
            case '42x59.4': formattedSize = '42 x 59,40 cm (A2)'; break;
            case '50x70': formattedSize = '50 x 70 cm'; break;
            case '59.4x84.1': formattedSize = '59,40 x 84,10 cm (A1)'; break;
            case '84.1x118.9': formattedSize = '84,10 x 118,90 cm (A0)'; break;
            default: formattedSize = imageData.size || 'Standard';
          }
        }

        // Produktname aus den Bilddaten holen
        const productName = typeof imageData === 'object' && imageData.productName ? 
          imageData.productName : 'KI-generiertes Poster';
        
        // URL entweder direkt aus dem String oder aus dem Objekt
        const imageUrl = typeof imageData === 'object' ? imageData.url : imageData;
        
        imagesHtml += `
          <div style="margin-bottom: 20px; text-align: center;">
            <img src="${imageUrl}" alt="${productName}" style="max-width: 100%; height: auto; max-height: 300px; display: block; margin: 0 auto; border: 1px solid #ddd; border-radius: 4px;">
            <div style="margin-top: 10px; font-size: 14px;">
              <strong>${productName}</strong>
              ${formattedSize ? `<br><span style="color: #777;">Größe: ${formattedSize}</span>` : ''}
            </div>
          </div>
        `;
      }
    }
    // Fallback: Wenn keine hochgeladenen Bilder vorhanden sind, versuchen wir die Original-URLs
    else if (orderData.items && orderData.items.length > 0) {
      imagesHtml = '<h3 style="margin-top: 20px;">Dein bestelltes Poster</h3>';
      
      for (const item of orderData.items) {
        // Verwende direkt die URL aus den Warenkorbdaten
        const imageUrl = item.url || item.imageUrl;
        if (imageUrl) {
          imagesHtml += `
            <div style="margin-bottom: 20px; text-align: center;">
              <img src="${imageUrl}" alt="Dein bestelltes Poster" style="max-width: 100%; height: auto; max-height: 300px; display: block; margin: 0 auto; border: 1px solid #ddd; border-radius: 4px;">
            </div>
          `;
        }
      }
    }
    
    // E-Mail an Kunden mit Bild
    const customerEmail = {
      to: orderData.customer.email,
      message: {
        subject: `Bestellbestätigung #${orderId}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Vielen Dank für deine Bestellung!</h2>
            <p>Hallo ${orderData.customer.name},</p>
            <p>wir haben deine Bestellung mit der Nummer <strong>#${orderId}</strong> erhalten und werden sie schnellstmöglich bearbeiten.</p>
            
            <h3 style="margin-top: 20px;">Bestellübersicht</h3>
            ${productsHtml}
            
            <h3 style="margin-top: 20px;">Lieferadresse</h3>
            <p>
              ${orderData.customer.name}<br>
              ${orderData.customer.address || orderData.customer.street || ''}<br>
              ${orderData.customer.zip} ${orderData.customer.city}
            </p>
            
            <h3 style="margin-top: 20px;">Zahlungsmethode</h3>
            <p>${orderData.paymentMethod}</p>
            
            <p style="margin-top: 20px;">Bei Fragen zu deiner Bestellung kannst du uns jederzeit kontaktieren.</p>
            
            <p style="margin-top: 30px;">Viele Grüße,<br>Dein CreateMyArt Team</p>
          </div>
        `
      }
    };
    
    // Admin-E-Mail vorbereiten - mehr Details für den Administrator
    let adminEmailHtml = `
      <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 5px;">
        <h2 style="color: #333; margin-bottom: 15px;">Neue Bestellung #${orderId}</h2>
        <p style="font-size: 16px; line-height: 1.5;">Eine neue Bestellung wurde aufgegeben:</p>
        
        <div style="background-color: #f8f8f8; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
          <h3 style="margin-top: 0;">Kundeninformationen</h3>
          <p style="margin: 5px 0;"><strong>Name:</strong> ${orderData.customer.name}</p>
          <p style="margin: 5px 0;"><strong>E-Mail:</strong> ${orderData.customer.email}</p>
          ${orderData.customer.phone ? `<p style="margin: 5px 0;"><strong>Telefon:</strong> ${orderData.customer.phone}</p>` : ''}
          <p style="margin: 5px 0;"><strong>Straße:</strong> ${orderData.customer.address || orderData.customer.street || ''}</p>
          <p style="margin: 5px 0;"><strong>PLZ:</strong> ${orderData.customer.zip}</p>
          <p style="margin: 5px 0;"><strong>Stadt:</strong> ${orderData.customer.city}</p>
          <p style="margin: 5px 0;"><strong>Land:</strong> ${orderData.customer.country || 'Deutschland'}</p>
        </div>
        
        <div style="margin-bottom: 20px;">
          <h3 style="margin-top: 0;">Bestelldetails</h3>
          <p style="margin: 5px 0;"><strong>Bestellnummer:</strong> ${orderId}</p>
          <p style="margin: 5px 0;"><strong>Datum:</strong> ${new Date().toLocaleString('de-DE')}</p>
          <p style="margin: 5px 0;"><strong>Zahlungsmethode:</strong> ${orderData.paymentMethod || 'PayPal'}</p>
          <p style="margin: 5px 0;"><strong>Status:</strong> ${orderData.status || 'Bezahlt'}</p>
          <p style="margin: 5px 0;"><strong>Gesamtbetrag:</strong> ${typeof orderData.total === 'number' ? 
            (orderData.total / 100).toFixed(2).replace('.', ',') + ' €' : 
            (typeof orderData.total === 'string' ? orderData.total : '0,00 €')}</p>
        </div>
        
        <h3 style="margin-top: 0;">Bestellte Produkte</h3>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <tr style="background-color: #f2f2f2;">
            <th style="padding: 10px; text-align: left; border: 1px solid #ddd;">Produkt</th>
            <th style="padding: 10px; text-align: left; border: 1px solid #ddd;">Größe</th>
            <th style="padding: 10px; text-align: right; border: 1px solid #ddd;">Preis</th>
          </tr>
          ${orderData.items.map(item => {
            const itemName = item.name || item.title || 'KI-generiertes Poster';
            
            // Formatierung der Größe
            let formattedSize = item.size || 'Standard';
            if (item.size) {
              switch(item.size) {
                case '21x29.7': formattedSize = '21 x 29,70 cm (A4)'; break;
                case '29.7x42': formattedSize = '29,70 x 42 cm (A3)'; break;
                case '42x59.4': formattedSize = '42 x 59,40 cm (A2)'; break;
                case '50x70': formattedSize = '50 x 70 cm'; break;
                case '59.4x84.1': formattedSize = '59,40 x 84,10 cm (A1)'; break;
                case '84.1x118.9': formattedSize = '84,10 x 118,90 cm (A0)'; break;
                default: formattedSize = item.size;
              }
            }
            
            // Preis formatieren - in Cent zu Euro umrechnen und deutsches Format
            const itemPrice = typeof item.price === 'number' ? 
              (item.price / 100).toFixed(2).replace('.', ',') + ' €' : 
              (typeof item.price === 'string' ? item.price : '0,00 €');
            
            return `<tr>
              <td style="padding: 10px; border: 1px solid #ddd;">${itemName}</td>
              <td style="padding: 10px; border: 1px solid #ddd;">${formattedSize}</td>
              <td style="padding: 10px; border: 1px solid #ddd; text-align: right;">${itemPrice}</td>
            </tr>`;
          }).join('')}
          <tr style="font-weight: bold;">
            <td style="padding: 10px; border: 1px solid #ddd;" colspan="2">Gesamtbetrag:</td>
            <td style="padding: 10px; border: 1px solid #ddd; text-align: right;">${typeof orderData.total === 'number' ? 
              (orderData.total / 100).toFixed(2).replace('.', ',') + ' €' : 
              (typeof orderData.total === 'string' ? orderData.total : '0,00 €')}</td>
          </tr>
        </table>
      </div>
    `;
    
    // Bilder für Admin-E-Mail
    adminEmailHtml += `<h3 style="margin-top: 20px;">Bestellte Bilder</h3>`;

    for (const imageData of processedImageUrls) {
      // Formatierter Größenname für die Anzeige
      let formattedSize = "";
      if (typeof imageData === 'object' && imageData.size) {
        switch(imageData.size) {
          case '21x29.7': formattedSize = '21 x 29,70 cm (A4)'; break;
          case '29.7x42': formattedSize = '29,70 x 42 cm (A3)'; break;
          case '42x59.4': formattedSize = '42 x 59,40 cm (A2)'; break;
          case '50x70': formattedSize = '50 x 70 cm'; break;
          case '59.4x84.1': formattedSize = '59,40 x 84,10 cm (A1)'; break;
          case '84.1x118.9': formattedSize = '84,10 x 118,90 cm (A0)'; break;
          default: formattedSize = imageData.size || 'Standard';
        }
      }

      // Produktname aus den Bilddaten holen
      const productName = typeof imageData === 'object' && imageData.productName ? 
        imageData.productName : 'KI-generiertes Poster';
      
      // URL entweder direkt aus dem String oder aus dem Objekt
      const imageUrl = typeof imageData === 'object' ? imageData.url : imageData;
      
      adminEmailHtml += `
        <div style="margin-bottom: 20px; text-align: center;">
          <img src="${imageUrl}" alt="${productName}" style="max-width: 100%; height: auto; max-height: 300px; display: block; margin: 0 auto; border: 1px solid #ddd; border-radius: 4px;">
          <div style="margin-top: 10px; font-size: 14px;">
            <strong>${productName}</strong>
            ${formattedSize ? `<br><span style="color: #777;">Größe: ${formattedSize}</span>` : ''}
          </div>
        </div>
      `;
    }
    
    // E-Mail an Admin
    const adminNotification = {
      to: adminEmail,
      message: {
        subject: `Neue Bestellung #${orderId}`,
        html: adminEmailHtml
      }
    };
    
    // E-Mails in die "mail" Collection speichern
    const mailCollection = collection(db, "mail");
    await addDoc(mailCollection, customerEmail);
    await addDoc(mailCollection, adminNotification);
    
    console.log("Bestellbestätigungs-E-Mails erfolgreich in die Firestore 'mail' Collection geschrieben");
    
  } catch (error) {
    console.error("Fehler beim Senden der Bestellbestätigungs-E-Mail:", error);
    // Fehler beim E-Mail-Versand sollte den Bestellprozess nicht unterbrechen
  }
}

/**
 * Speichert ein Bild im Firebase Storage
 * @param {string} imageUrl - Die URL des zu speichernden Bildes
 * @param {string} orderId - Die Bestellungs-ID
 * @param {string} size - Die Größe des Bildes (optional)
 * @returns {Promise<Object>} - Erfolg/Fehler-Objekt mit URL und Pfad
 */
async function saveImageToStorage(imageUrl, orderId, size = '') {
  try {
    // Prüfen, ob Firebase Storage verfügbar ist
    if (!storage) {
      const initSuccess = await initializeFirebase();
      if (!initSuccess || !storage) {
        return { 
          success: false, 
          error: "Storage-Dienst nicht verfügbar."
        };
      }
    }
    
    // Bild von URL abrufen
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Fehler beim Abrufen des Bildes: ${response.status} ${response.statusText}`);
    }
    
    const blob = await response.blob();
    
    // Größeninfo für den Dateinamen aufbereiten
    const sizeInfo = size ? `_size_${size.replace(/\./g, '_')}` : '';
    
    // Referenz im Storage erstellen (mit eindeutigem Zeitstempel und Größeninformation)
    const imagePath = `orders/${orderId}/${Date.now()}${sizeInfo}.jpg`;
    const storageRef = ref(storage, imagePath);
    
    // Bild hochladen
    await uploadBytes(storageRef, blob);
    
    // Download-URL zurückgeben
    const downloadUrl = await getDownloadURL(storageRef);
    
    return {
      success: true,
      url: downloadUrl,
      path: imagePath,
      size: size // Größeninformation zurückgeben
    };
  } catch (error) {
    console.error("Fehler beim Speichern des Bildes:", error);
    return { 
      success: false, 
      error: error.message || "Unbekannter Fehler beim Speichern des Bildes"
    };
  }
}

/**
 * Aktualisiert die Bild-URLs einer Bestellung
 * @param {string} orderId - Die ID der zu aktualisierenden Bestellung
 * @param {Array<Object>} imageData - Die Liste der Bilddaten (URLs und Größen)
 * @returns {Promise<Object>} - Erfolg/Fehler-Objekt
 */
async function updateOrderImageUrls(orderId, imageData) {
  try {
    if (!db) {
      const initSuccess = await initializeFirebase();
      if (!initSuccess || !db) {
        return {
          success: false,
          error: "Firebase-Dienst nicht verfügbar."
        };
      }
    }
    
    // Referenz zum Bestelldokument erstellen
    const orderRef = doc(db, "orders", orderId);
    
    // Bildinformationen formatieren
    const imageDetails = Array.isArray(imageData) ? imageData.map(data => {
      // Wenn es bereits ein Objekt ist, sicherstellen, dass alle erwarteten Felder vorhanden sind
      if (typeof data === 'object' && data !== null) {
        return {
          url: data.url || '',
          path: data.path || '',
          size: data.size || 'Standard',
          productName: data.productName || 'KI-generiertes Bild',
          prompt: data.prompt || '',
          productId: data.productId || data.path || '',
          imageId: data.imageId || '',
          timestamp: new Date().toISOString()
        };
      }
      
      // Wenn es ein String ist, in ein Objekt ohne Größeninformation umwandeln
      return { 
        url: data,
        size: 'Unbekannt',
        productName: 'KI-generiertes Bild',
        timestamp: new Date().toISOString()
      };
    }) : [];
    
    // Dokument aktualisieren mit verbesserter Datenspeicherung
    await updateDoc(orderRef, { 
      imageUrls: imageDetails.map(img => img.url), // Für Rückwärtskompatibilität
      imageDetails: imageDetails, // Neue Struktur mit vollständigen Informationen
      posterSizes: imageDetails.map(img => ({
        url: img.url,
        size: img.size,
        productName: img.productName,
        productId: img.productId || img.path || ''
      })), // Zusätzliches Array nur für Poster-Größen-Zuordnung
      lastUpdated: new Date().toISOString()
    });
    
    return { success: true };
  } catch (error) {
    console.error("Fehler beim Aktualisieren der Bestellung mit Bild-URLs:", error);
    return {
      success: false,
      error: error.message || "Unbekannter Fehler beim Aktualisieren der Bestellung"
    };
  }
}

/**
 * Ruft Bestellungen für eine E-Mail-Adresse ab
 * @param {string} email - Die E-Mail-Adresse des Kunden
 * @returns {Promise<Object>} - Erfolg/Fehler-Objekt mit Bestellungen
 */
async function getOrdersByEmail(email) {
  try {
    if (!db) {
      const initSuccess = await initializeFirebase();
      if (!initSuccess || !db) {
        return { 
          success: false, 
          error: "Firebase-Dienst nicht verfügbar."
        };
      }
    }
    
    // Abfrage nach E-Mail und Zeit sortiert
    const ordersCollection = collection(db, "orders");
    const q = query(
      ordersCollection, 
      where("customer.email", "==", email),
      orderBy("timestamp", "desc")
    );
    
    const querySnapshot = await getDocs(q);
    const orders = [];
    
    querySnapshot.forEach((doc) => {
      orders.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    return {
      success: true,
      orders
    };
  } catch (error) {
    console.error("Fehler beim Abrufen der Bestellungen:", error);
    return {
      success: false,
      error: error.message || "Unbekannter Fehler beim Abrufen der Bestellungen"
    };
  }
}

// Firebase-Funktionen im API-Objekt zusammenfassen
const FirebaseAPI = {
  initializeFirebase,
  saveOrderToFirestore,
  saveImageToStorage,
  updateOrderImageUrls,
  getOrdersByEmail,
  sendOrderConfirmationEmail
};

// Exportieren des API-Objekts
export { FirebaseAPI };

// Globale Verfügbarkeit für ältere Skripte
window.FirebaseAPI = FirebaseAPI;

// Firebase sofort initialisieren
initializeFirebase(); 