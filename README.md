# CreateMyArt - KI-generierte Poster Online-Shop

Ein responsiver Online-Shop für KI-generierte Poster, entwickelt mit HTML, CSS und JavaScript.

## Funktionen

- Text-zu-Bild Poster-Generierung mit Benutzer-Prompts
- Tägliches Limit von 30 Bildgenerierungen pro Benutzer
- Warenkorb-Funktionalität
- Checkout-Prozess
- Responsive Design für alle Geräte
- Lokale Speicherung von Generierungslimit und Warenkorb

## Updates
- 2024-03-21: Zur Kasse Button auf rechtlichen Seiten funktionsfähig gemacht

## Projektstruktur

```
/
├── index.html          # Hauptseite des Online-Shops
├── css/
│   └── style.css       # Styling für die Webseite
├── js/
│   └── script.js       # JavaScript-Funktionalität
├── img/                # Verzeichnis für Bilder (wird automatisch erstellt)
└── README.md           # Diese Datei
```

## Lokale Ausführung

### Methode 1: Mit Live Server (empfohlen)

1. Stelle sicher, dass [Visual Studio Code](https://code.visualstudio.com/) installiert ist
2. Installiere die [Live Server Extension](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer) für VS Code
3. Öffne das Projektverzeichnis in VS Code
4. Klicke auf "Go Live" in der unteren rechten Ecke von VS Code
5. Der Browser öffnet sich automatisch mit der Webseite

### Methode 2: Manuell über den Dateisystem-Zugriff

1. Öffne den Datei-Explorer
2. Navigiere zum Projektverzeichnis
3. Doppelklicke auf die Datei `index.html`
4. Die Webseite öffnet sich im Standard-Browser

## Hinweise zur Entwicklung

- Die Bildgenerierung verwendet derzeit Platzhalterbilder, da keine echte API angebunden ist
- Die Zahlungsabwicklung ist als Platzhalter implementiert
- Alle Daten werden lokal im Browser gespeichert (localStorage)

## Zukünftige Erweiterungen

- Integration einer echten KI-Bildgenerations-API
- Anbindung von Zahlungsdienstleistern (Stripe, PayPal)
- Firebase-Integration für Benutzer- und Bestelldaten
- Erweiterte Anpassungsoptionen für generierte Bilder

## Fehlerbehebung

Falls Bilder nicht angezeigt werden:
- Stelle sicher, dass du die Webseite über einen Server ausführst (z.B. Live Server)
- Einige Browser blockieren lokale Ressourcen aus Sicherheitsgründen

Falls der Warenkorb nicht funktioniert:
- Überprüfe, ob localStorage in deinem Browser aktiviert ist
- Versuche, den Browser-Cache zu leeren

## Lizenz

Dieses Projekt ist für Bildungszwecke erstellt und nicht für den kommerziellen Einsatz gedacht.

## Deployment auf Vercel

### Vorbereitung

1. Erstelle ein Konto auf [Vercel](https://vercel.com) falls noch nicht vorhanden
2. Verbinde dein Git-Repository mit Vercel
3. Stelle sicher, dass die folgenden Umgebungsvariablen in Vercel konfiguriert sind:

### Umgebungsvariablen in Vercel einrichten

Gehe zum Projekt-Dashboard in Vercel, wähle "Settings" und dann "Environment Variables". Füge dort die folgenden Variablen hinzu:

#### Firebase Konfiguration
- `FIREBASE_API_KEY`
- `FIREBASE_AUTH_DOMAIN`
- `FIREBASE_PROJECT_ID`
- `FIREBASE_STORAGE_BUCKET`
- `FIREBASE_MESSAGING_SENDER_ID`
- `FIREBASE_APP_ID`
- `FIREBASE_MEASUREMENT_ID`

#### PayPal Konfiguration
- `PAYPAL_CLIENT_ID`

#### Runware API Konfiguration
- `RUNWARE_API_KEY`

#### Administrator E-Mail
- `ADMIN_EMAIL`

### Deployment starten

1. Pushe deine Änderungen in das verbundene Git-Repository
2. Vercel wird automatisch einen neuen Build und ein Deployment starten
3. Nach erfolgreichem Deployment kannst du die Anwendung unter der von Vercel bereitgestellten URL aufrufen

### Umgebungsvariablen für lokale Entwicklung

Für die lokale Entwicklung:

1. Kopiere die Datei `.env.local` und fülle die benötigten Werte aus
2. Verwende `vercel dev` für lokale Entwicklung mit den Vercel-Funktionen 