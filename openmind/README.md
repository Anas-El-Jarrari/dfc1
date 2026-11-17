# OpenMind · dfc1

React-App mit **Next.js**, bestehender Navigation, Profilen, Nachrichten, Beteiligungsangeboten und dem Maskottchen Kim. Die lokale Agentenkette aus DFC ist als Backend in dieses Projekt integriert; DFC wird weder importiert noch verändert. Es werden keine Zugangsdaten aus DFC benötigt.

## Lokale Einrichtung

Benötigt: **Node.js ab 22.12**, npm, laufendes Ollama und SearXNG. Unter Windows im Ordner `dfc1/openmind`:

```powershell
npm install
Copy-Item .env.example .env.local
ollama pull qwen3:8b
npm run db:migrate
npm run dev
```

Öffne die in `APP_URL` konfigurierte Adresse, standardmäßig [localhost:3000](http://localhost:3000). Eine bereits laufende Ollama-/SearXNG-Instanz aus der bisherigen lokalen Installation kann weiterverwendet werden. Trage nur deren URLs in die neue Konfiguration ein; kopiere keine DFC-Umgebungsdatei oder Token-Datei.

- Ollama: `OLLAMA_BASE_URL`, `OLLAMA_MODEL`; das Modell muss installiert sein. Modell und Arbeitsschritte werden im Schreibablauf angezeigt.
- SearXNG: `SEARXNG_URL`; in dessen `settings.yml` muss unter `search.formats` sowohl `html` als auch `json` erlaubt sein. Der Server muss `/search?q=...&format=json` als JSON liefern. Ein laufendes Docker-Setup muss dafür nicht dupliziert werden.
- `npm run db:migrate` legt die neuen Tabellen an und entfernt die alte Testempfänger-Einstellung. Vor einer Migration einer bestehenden Datenbank eine Sicherung anlegen.
- `/status` zeigt in der Entwicklung Ollama, Suche, Datenbank, Login-Mail und Gmail-Konfiguration.
- Alte Gemini-/Anthropic-Schlüssel werden nicht verwendet. `OLLAMA_ENABLED=false` schaltet die allgemeinen KI-Agenten ab; der recherchierte Schreibablauf benötigt Ollama.
- `MAIL_MODE`/SMTP betreffen ausschließlich die vorhandenen **Anmeldelinks**, niemals den Versand von Anliegen. Im lokalen Entwicklungsbetrieb zeigt `MAIL_MODE=console` den Anmeldelink an. Öffentlich SMTP konfigurieren.

Ollama-Aufrufe laufen lokal; **Websuche und Gmail benötigen Internet**. Geschwindigkeit und erreichbare Qualität hängen vom Modell und der Hardware ab. Siehe [Ollama Chat API](https://docs.ollama.com/api/chat).

## Gmail einrichten

1. Im eigenen Google-Cloud-Projekt die **Gmail API** aktivieren und den OAuth-Zustimmungsbildschirm einrichten. Im Google-Testbetrieb das gewünschte Google-Konto als Testnutzer zulassen.
2. Einen OAuth-Client vom Typ **Webanwendung** erstellen. Als autorisierte Weiterleitung exakt `http://localhost:3000/api/mail/oauth/callback` eintragen (bei anderem Host/Port alle drei Werte `APP_URL`, Redirect in Google und `GMAIL_REDIRECT_URI` passend ändern).
3. Die eigenen Werte für `GMAIL_CLIENT_ID` und `GMAIL_CLIENT_SECRET` in `.env.local` eintragen.
4. Einen lokalen Schlüssel erstellen und nur das Ergebnis als `GMAIL_TOKEN_KEY` eintragen:

   ```powershell
   node -e "console.log(require('node:crypto').randomBytes(32).toString('base64'))"
   ```

5. Server neu starten. In der App anmelden und unter **Ich → Dein Gmail-Konto → Gmail verbinden** das gewünschte Konto selbst freigeben. Alternativ im Schritt „Prüfen“ verbinden; der gespeicherte Entwurf wird danach fortgesetzt.

OAuth verwendet PKCE, einen einmaligen, an Konto und Sitzung gebundenen State und die Berechtigungen `openid email gmail.send`. Refresh-Tokens werden pro OpenMind-Konto mit AES-256-GCM verschlüsselt gespeichert. Den Token-Schlüssel sicher und dauerhaft aufbewahren. Bei Verlust Gmail neu verbinden. Die App liest weder Posteingang noch gesendete Nachrichten. Die Google-Freigabe kann zusätzlich im Google-Konto widerrufen werden.

Dokumentation: [Google OAuth für Webserver](https://developers.google.com/identity/protocols/oauth2/web-server), [Gmail-Nachrichten senden](https://developers.google.com/workspace/gmail/api/guides/sending).

## Anliegen bis Versand

1. Unter **Mitmachen → Etwas verändern** oder auf einer Themenseite beginnen. Kim übernimmt Ort/Stadtteil aus dem Profil; fehlenden Ort unter „Ich“ ergänzen.
2. Eigene Beobachtung und Ziel eingeben. Die bestehende Verfahrensauswahl bleibt ein erster Vorschlag.
3. Fünf Schritte: Anliegen aufnehmen → SearXNG-Recherche → Zuständigkeit, Kontakte und Möglichkeiten → begründeter Nachrichtentwurf → unabhängiger Ethics Guardian. Fakten, Rechtsgrundlagen, Einschränkungen und Gegenposition werden mit Quellen dargestellt. Fotos/Unterlagen gelten nur bei einem Beleg als Pflicht.
4. Empfänger, Kontaktquelle, Betreff und vollständigen Text prüfen und bearbeiten. Die App prüft die gewählte Adresse auf der recherchierten Kontaktseite erneut. Änderungen am Text werden erneut vom Guardian geprüft. Die Kontaktquelle kann innerhalb der recherchierten Empfängerseiten gewechselt werden; für andere Quellen neu recherchieren.
5. Vorschau öffnen, Prüfung ausdrücklich bestätigen und **Wischen zum Senden** (auch per Tastatur erreichbar). Gmail sendet genau den freigegebenen Betreff/Text vom verbundenen Konto an den sichtbaren Empfänger. **Kein Testmodus, keine Umleitung und keine versteckten Kopie-Empfänger.**
6. Bei ausschließlich belegtem Onlineformular: Text kopieren und offiziellen Formularlink öffnen. Es gibt dafür keinen Gmail-Versand.

Die KI bestätigt oder sendet niemals eigenständig. Jeder Versand benötigt eine 15 Minuten gültige, an die gespeicherte Fassung gebundene Freigabe. Änderungen an Empfänger, Text, Anliegen, Profil oder Gmail-Absender erfordern eine erneute Prüfung. Gesendete Schreiben erscheinen unter „Wirkung“ und in Gmail.

Eine dauerhafte Datenbanksperre verhindert Doppelversand auch bei parallelen Anfragen oder Serverneustarts. Nach einem mehrdeutigen Google-Timeout wird nicht erneut gesendet: Status „unklar“, Gmail-Ordner „Gesendet“ manuell prüfen. Eine gestartete oder unklare Sendung bleibt gesperrt. Nach eindeutiger Ablehnung ist eine neue Prüfung und Bestätigung möglich.

## Prüfungen

```powershell
npm test
npx tsc --noEmit
npm run build
npx playwright install chromium
npm run test:e2e
```

`npm run agent:smoke` führt zusätzlich zwei Anliegen mit dem tatsächlichen lokalen Ollama-Modell und SearXNG durch den Agentenablauf und prüft eine unvollständige Eingabe. Es nutzt keine Gmail-/OAuth-Funktion und versendet keine E-Mail.

Unit-/Integrationstests verwenden eine isolierte SQLite-Datenbank und simulieren Ollama, Suchseiten, OAuth und Gmail. Die Browserprüfungen simulieren die externe Agentenkette und den Versand über API-Routen; die Konten und Entwürfe laufen gegen eine separate lokale Testdatenbank. Es wird **keine echte E-Mail gesendet** und es werden keine persönlichen Zugangsdaten verwendet. Der neue produktive Versand enthält keinen Testtransport.

Die Prüfungen decken u. a. JSON-Fehler, Kontaktbelege, Formularwege, Guardian-Blockaden, Profilwechsel, OAuth-State/PKCE, Kontotrennung, bearbeitete Vorschauen, parallele Sendungen, Google-Timeouts und Vor-/Zurücknavigation ab.

## Aufbau und Grenzen

- `core/ai`: ausschließlich Ollama, JSON-Schema und begrenzte Wiederholung bei fehlerhafter Antwort.
- `core/research`: Recherche, fünf Agentenschritte, Quellseitenprüfung und Bindung an das aktuelle Profil/Anliegen.
- `core/gmail`: OAuth, verschlüsselte Konten, Prüfungen, MIME-Nachricht und dauerhafte Versandzustände.
- `features/write`: vorhandenes Design, Schrittansichten, eigene/ KI-Worte, bearbeitbare Vorschau.
- `agents`: vorhandene Chat-, Abwäge-, Erklär- und Faktencheck-Funktionen laufen ebenfalls über Ollama.
- Die vorhandenen News, Angebote, Tutorial, Konto- und Datenschutzfunktionen bleiben bestehen. Ältere ausdrücklich markierte Beispielthemen sind weiterhin Beispieldaten.
- Der lokale Modelllauf und Quelltexte ersetzen keine rechtliche Prüfung. Eine auf der Seite vorhandene Adresse beweist die Adresse; die fachliche Zuständigkeit wird vom Modell geprüft und muss vom Menschen kontrolliert werden. Nicht lesbare/geschützte Quellen und unklare Kontakte sperren den Versand.
- Recherche-Cache: eine Stunde pro Entwurf und unverändertem Profil/Anliegen; „Recherche aktualisieren“ erzwingt einen neuen Lauf. Quellenprüfung vor Versand erfolgt erneut.
- Rechner/Server benötigt Zugriff auf Ollama und SearXNG. Serverlose Bereitstellung ohne diese Dienste reicht nicht. In Produktion HTTPS, dauerhafte Datenbank und Secrets außerhalb des Repositories verwenden.
- Die Begrenzung paralleler Rechercheläufe und allgemeine API-Ratenlimits gelten pro Serverprozess; die Versandsperre liegt dauerhaft in der Datenbank.

