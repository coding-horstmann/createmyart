# CreateMyArt - Anleitung zur Ausführung

Diese Anleitung erklärt, wie du den KI-Poster-Online-Shop lokal auf deinem Computer ausführen kannst.

## Voraussetzungen

- Ein moderner Webbrowser (Chrome, Firefox, Edge oder Safari)
- Optional: Visual Studio Code mit der Live Server Extension

## Methode 1: Mit Visual Studio Code und Live Server (empfohlen)

1. **Visual Studio Code installieren**
   - Lade [Visual Studio Code](https://code.visualstudio.com/) herunter und installiere es.

2. **Live Server Extension installieren**
   - Öffne VS Code
   - Klicke auf das Extensions-Symbol in der linken Seitenleiste (oder drücke `Ctrl+Shift+X`)
   - Suche nach "Live Server"
   - Installiere die Extension von Ritwick Dey

3. **Projekt öffnen**
   - Öffne VS Code
   - Wähle "File" > "Open Folder" und navigiere zum Projektverzeichnis
   - Wähle den Ordner aus und klicke auf "Ordner auswählen"

4. **Live Server starten**
   - Klicke auf "Go Live" in der unteren rechten Ecke von VS Code
   - Alternativ: Rechtsklick auf `index.html` und wähle "Open with Live Server"
   - Der Browser öffnet sich automatisch mit der Webseite

## Methode 2: Direkt über den Browser

1. **Projektdateien entpacken**
   - Stelle sicher, dass alle Projektdateien in einem Ordner entpackt sind

2. **index.html öffnen**
   - Navigiere zum Projektordner
   - Doppelklicke auf die Datei `index.html`
   - Die Webseite öffnet sich in deinem Standard-Browser

## Hinweise zur Nutzung

- **Bildgenerierung**: Gib einen Text in das Eingabefeld ein und klicke auf "Erstellen", um ein KI-generiertes Bild zu simulieren.
- **Tägliches Limit**: Du hast 30 Generierungen pro Tag. Dieses Limit wird in deinem Browser gespeichert und täglich zurückgesetzt.
- **Warenkorb**: Du kannst generierte Bilder in verschiedenen Größen in den Warenkorb legen und den Checkout-Prozess simulieren.

## Platzhalterbilder

Die Anwendung verwendet derzeit Platzhalterbilder für die Generierung. In einer echten Implementierung würden diese durch eine Anbindung an eine KI-Bildgenerations-API ersetzt werden.

## Bekannte Einschränkungen

- Die Anwendung verwendet `localStorage` zur Speicherung des Warenkorbs und des Generierungslimits. Diese Daten gehen verloren, wenn du den Browser-Cache löschst.
- Die Zahlungsabwicklung ist nur simuliert und verarbeitet keine echten Zahlungen.
- Die Kontaktformular-Daten werden nicht tatsächlich gesendet.

## Fehlerbehebung

Falls Probleme auftreten:

1. **Bilder werden nicht angezeigt**
   - Stelle sicher, dass du die Webseite über einen Server ausführst (z.B. Live Server)
   - Einige Browser blockieren lokale Ressourcen aus Sicherheitsgründen

2. **JavaScript-Funktionen funktionieren nicht**
   - Überprüfe, ob JavaScript in deinem Browser aktiviert ist
   - Öffne die Browser-Konsole (F12), um mögliche Fehlermeldungen zu sehen

3. **Warenkorb funktioniert nicht**
   - Überprüfe, ob localStorage in deinem Browser aktiviert ist
   - Versuche, den Browser-Cache zu leeren 