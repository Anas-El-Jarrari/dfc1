# Architektur
```
app/api/agents/[name]     geschützte bestehende Kim-Agenten
app/api/agents/application sechs lokale Recherche- und Schreibschritte als SSE
app/api/mail/*            Gmail-OAuth, Kontostatus, Entwurf prüfen
app/api/submissions       explizit bestätigter Gmail-Versand
agents/                   Chat-, Abwäge-, Erklär- und Faktencheck-Agenten
core/ai                   Ollama Chat/JSON-Schema, Modellangabe
core/research             SearXNG, Quellprüfung, Zuständigkeit, Lösungsschritte, Draft, Guardian
core/gmail                Google OAuth, AES-256-GCM-Token, signierte Versandvorschau, Gmail API
core/db                   Drizzle-Schema, Migrationen, SQLite oder libSQL
features/write            vorhandener Schrittablauf, editierbare Nutzer-/KI-Worte
```

## Recherche und Entwurf

Der Schreibablauf ist ein eigenständiger sechsstufiger Lauf: Anliegen aus den eigenen Angaben aufnehmen, Quellen zu Anliegen/Ort recherchieren, zuständige Stelle und mögliche Schritte mit Rechtsgrundlagen prüfen, begründete Nachricht erstellen, diese durch einen zweiten Guardian prüfen und anschließend Informationen aus Sicht politischer Beteiligung filtern. Der letzte Agent darf keine Inhalte erfinden oder verändern, sondern wählt ausschließlich bereits recherchierte Punkte und Quellen aus. Belegte Kontakte und Quellen der Zuständigkeit, Empfehlung, Rechtsgrundlage sowie Zitate bleiben unabhängig davon in der Ergebnisansicht. SearXNG erhält Suchbegriffe mit Profilort. Der lokale Ollama-Server erhält den nötigen Kontext. Die UI zeigt je Stufe das zurückgegebene lokale Modell. Quellen dürfen keine Anweisungen für den Agenten erteilen.

Für Anliegen zu Bahnhöfen der Deutschen Bahn wird die offizielle DB-Info-Kontaktseite gezielt geladen und der E-Mail-Kontext neben der gefundenen Adresse gespeichert. Die dort ausgewiesene Adresse für Feedback zu Bahnhöfen wird als Empfänger übernommen. Die allgemeine Versandprüfung ruft die gewählte Kontaktseite vor jeder Freigabe erneut ab.

Kontakte und Gesetze bekommen nur Quellen-IDs aus dem ermittelten Korpus. Vor dem Versand ruft der Server die Kontaktseite nochmals direkt auf und vergleicht die Adresse. Bei Formular-only gibt es nur den amtlichen Formularlink. Änderungen am Anliegen oder Profil ändern den Recherche-Fingerabdruck. Der ein Stunden lange Recherchecache gilt ausschließlich für dieselbe Eingabe und denselben Standort.

Ollama verwendet `core/ai/client.ts` und `core/ai/json.ts`. Es gibt weder Gemini-/Anthropic-Fallback noch Cloud-Key. Modell-JSON wird anhand eines zod-Schemas geprüft und genau einmal bei fehlerhafter Struktur wiederholt. Die zentrale App-Route ruft `core/research/pipeline.ts` direkt auf.

## Versand und Doppelversand

`/api/mail/oauth/start` erstellt einen zufälligen State plus PKCE-Challenge, speichert ausschließlich den State-Hash und bindet den Rücksprung an Konto, Sitzung und erlaubten lokalen Pfad. Der Callback verlangt einmaligen gültigen State und die Gmail-Sendeberechtigung. Refresh-Tokens speichert `core/gmail/client.ts` mit AES-256-GCM und einem separat konfigurierten Schlüssel.

`/api/mail/review` vergleicht Profil, Anliegen, Empfänger, Quellen, Absender, Betreff und den vollständigen Nachrichtentext. E-Mail-Adresse und Empfängerquelle werden erneut geprüft. Ein bearbeiteter Text läuft erneut durch den Guardian. Die kurzlebige Prüfung speichert einen Hash genau dieses Pakets.

Erst der Clientaufruf mit gültiger Review-ID **und** ausdrücklicher Bestätigung darf `/api/submissions` ausführen. Eine dauerhafte Primärschlüsselzeile pro Entwurf serialisiert parallele Anfragen, auch nach Neustart des Prozesses. Eindeutige Ablehnungen sind gesperrt, bis ein Mensch erneut prüft. Netzwerkfehler/Google-Fehler 5xx bleiben `unklar` und werden nie automatisch wiederholt, weil Gmail die Mail angenommen haben könnte. Ein Ergebnis unklar = manuell im Ordner „Gesendet“ prüfen.

Die vorhandene SMTP-Console-Option gilt ausschließlich für die Anmeldung per E-Mail-Link. E-Mail-Anliegen umgehen `core/mail` vollständig und nutzen das verbundene Gmail-Konto direkt. Empfänger, Betreff und Text sind vor dem Wisch sichtbar und editierbar; es gibt keine Kopie an ein hinterlegtes Testpostfach.

## Neue Agenten

`agents/registry.ts` nimmt einen neuen Agenten auf. Das optionale deterministische Verhalten bei `OLLAMA_ENABLED=false` ist in `agents/types.ts` dokumentiert. Agentenendpunkte brauchen Sitzung, Same-Origin-Anfrage und Rate-Limit.

## Datenbank

Schema: `core/db/schema.ts`. `npm run db:migrate` wendet die nummerierten SQL-Dateien auf die aktive Datenbank an. `DATABASE_URL` unterstützt lokale SQLite-Dateien oder einen libSQL/Turso-Server. Die Gmail-Token-Daten werden nie in Entwürfe oder Datenexporte kopiert. Der Export enthält Kontoadresse und Zeit der Gmail-Verbindung, aber keine Token oder Schlüssel.

