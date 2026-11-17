# OpenMind v2 – Schritt-für-Schritt-Plan zum funktionierenden MVP

> **Ziel:** Ein MVP, der **wirklich funktioniert**: echtes Login, echte personalisierte News, echte Petitionen und Engagement-Angebote, echte Antrags- und Stellungnahmen-Agenten, echter Mailversand an eine selbst eingetragene Adresse.
> **Gefühl:** Comfort-App, warm, ruhig, lebendig, wenig Text.
> **Grundsatz:** Die KI hilft, du entscheidest. „Erst du“, Wisch-Slider zum Einreichen, nur geprüfte Quellen.

**Regel für jeden Schritt:** Ein Schritt ist erst fertig, wenn er **im Browser ausprobiert** wurde und ein **Test** existiert. Nach jedem Schritt folgt ein Commit.

Legende: ⬜ offen · 🔄 in Arbeit · ✅ fertig · 🧪 Prüfung („Fertig, wenn …“)

---

## Festgelegte Entscheidungen

| Thema | Entscheidung |
|---|---|
| Automatisierung | „Erst du“: eigene 1–3 Sätze, dann der Agent-Entwurf |
| Fakten-Check | Hinterlegte Quellen und Live-Websuche, nur auf Whitelist-Domains |
| News | Echte Nachrichten aus offiziellen RSS-Feeds bzw. APIs, **nur Überschrift, kurzer Anriss, Quelle und Link**, nie ganze Artikel |
| Petitionen und Engagement | Echte, laufende Angebote aus offiziellen Portalen. Mitmachen findet **auf dem Original-Portal** statt (Weiterleitung), eigene Anliegen werden per Mail aus der App gesendet. |
| Versand (MVP) | Eigene E-Mail plus frei eintragbare Empfänger-Mail. Offizielle Adressen kommen später. |
| Login | Mehrere Konten, Anmeldung per Link per E-Mail |
| Stil | Warme Farben, Karten, Icons, sanfte Animationen |

---

## Rechtliches zu News (kurz, keine Rechtsberatung)

- **Amtliche Texte** wie Pressemitteilungen von Stadt, Land, Bund und EU, Gesetze und Ratsbeschlüsse sind nach § 5 UrhG weitgehend frei nutzbar. Das ist die **sicherste Basis**.
- **Presseartikel** (Zeitungen, Sender): Überschrift, wenige Wörter Anriss und Link sind in der Regel unproblematisch. Das Presseverleger-Leistungsschutzrecht (§ 87f UrhG) erlaubt „einzelne Wörter oder sehr kurze Auszüge“. **Nicht erlaubt:** ganze Artikel oder lange Auszüge kopieren.
- **RSS-Feeds** sind zum Weiterverbreiten gedacht, haben aber teils **eigene Nutzungsbedingungen**. Diese prüfen wir pro Quelle (Schritt 8.2) und speichern sie in der Whitelist.
- **KI-Zusammenfassungen** erstellen wir nur aus amtlichen Quellen. Bei Presse zeigen wir den Original-Anriss und verlinken.
- **Kennzeichnung** steht immer dabei: Quelle, Datum, Link, „Original lesen“.
- Vor einem öffentlichen Start sollte eine Jurist*in einmal draufschauen. Für den Wettbewerb und die Demo ist dieser Ansatz üblich.

---

# Teil A – Fundament

## Phase 0 – Aufräumen (½ Tag)

- ✅ 0.1 Den Anthropic-Client fest auf `https://api.anthropic.com` setzen
- ✅ 0.2 Startprüfung beim Serverstart: Fehlt der Key oder ist er ein Platzhalter, erscheint eine klare Meldung im Terminal
- ✅ 0.3 Helfer `safeRoute()`: fängt Fehler ab und gibt eine freundliche JSON-Antwort zurück
- ✅ 0.4 Alle bestehenden API-Routen nutzen `safeRoute()`
- ✅ 0.5 Seite `/status` (nur in der Entwicklung) zeigt: KI erreichbar ✓/✗, Datenbank ✓/✗, Mail-Modus
- 🧪 Kim antwortet mit echtem Key. Ohne Key erscheint eine freundliche Meldung statt Fehler 500.

## Phase 1 – Architektur (1 Tag)

- ✅ 1.1 Neue Ordner anlegen: `core/`, `agents/`, `features/`, `ui/`, `data/`
- ✅ 1.2 `core/ai/client.ts`: einziger Ort, an dem der Anthropic-Client entsteht
- ✅ 1.3 `core/ai/json.ts`: KI-Antwort lesen und mit einem zod-Schema prüfen, bei Fehler einmal neu versuchen
- ✅ 1.4 `core/guardian/`: Regel-Check und KI-Check aus `lib/ai.ts` hierher verschieben
- ✅ 1.5 `agents/types.ts`: Schnittstelle `Agent { name, input (zod), output (zod), run() }`
- ✅ 1.6 `agents/registry.ts`: Liste aller Agenten
- ✅ 1.7 `app/api/agents/[name]/route.ts`: eine Route für alle Agenten (Validierung, Guardian, Fehler)
- ✅ 1.8 Kim-Agent auf die neue Struktur umziehen
- ✅ 1.9 Explain-, Weigh-, Ask- und Rephrase-Agent umziehen
- ✅ 1.10 Alte Routen entfernen, Frontend auf die neue Route umstellen
- ✅ 1.11 `ARCHITECTURE.md`: „Neuen Agenten hinzufügen in 3 Schritten“
- 🧪 Alle bisherigen Funktionen laufen über `/api/agents/*`, die Tests sind grün.

## Phase 2 – Datenbank (½ Tag)

- ✅ 2.1 SQLite plus Drizzle installieren
- ✅ 2.2 `core/db/schema.ts`: Tabelle `users`
- ✅ 2.3 Tabelle `profiles` (Werte, PLZ/Stadtteil, Interessen, Barrierefreiheit, Tutorial erledigt)
- ✅ 2.4 Tabelle `settings` (eigene Mail, Empfänger-Mail)
- ✅ 2.5 Tabelle `drafts` (Typ, Inhalt, eigener Anteil, Status)
- ✅ 2.6 Tabelle `submissions` (an wen, wann, Mail-ID, Status)
- ✅ 2.7 Tabelle `news_items` (Quelle, Titel, Anriss, Link, Datum, Themen-Tags)
- ✅ 2.8 Tabelle `opportunities` (Petitionen, Ehrenamt, Beteiligungsverfahren)
- ✅ 2.9 Tabelle `saved` (gemerkte News und Angebote je Nutzer*in)
- ✅ 2.10 Migrationen und ein Seed-Skript `npm run db:seed`
- 🧪 `npm run db:reset && npm run db:seed` läuft, die Daten sind in Drizzle Studio sichtbar.

---

# Teil B – Look und Gefühl

## Phase 3 – Warmes Design-System (1 Tag)

- ✅ 3.1 Farb-Tokens in `ui/tokens.css`:
  | Rolle | Farbe |
  |---|---|
  | Hintergrund | `#FBF6EF` Creme |
  | Karte | `#FFFFFF`, Schatten `#E9DCCB` |
  | Primär | `#D9825B` Terrakotta |
  | Sekundär | `#7FA38A` Salbei |
  | Akzent | `#F2C46D` Honig |
  | Text | `#3B2F2A` Espresso |
  | Text leise | `#8A7A70` |
  | Pro / Contra | `#E3EEE6` / `#F4DCD6` |
- ✅ 3.2 Kontrast-Skript prüft alle Paare auf AA, Farben bei Bedarf nachjustieren
- ✅ 3.3 Schrift: eine runde, freundliche Sans (z. B. Nunito) über `next/font`
- ✅ 3.4 Radius-, Abstand- und Schatten-Tokens
- ✅ 3.5 `motion` installieren
- ✅ 3.6 `ui/Card` (mit Einblend-Animation)
- ✅ 3.7 `ui/Button`, `ui/IconButton` (lucide-Icons)
- ✅ 3.8 `ui/Pill` (Filter-Chips)
- ✅ 3.9 `ui/BottomSheet`
- ✅ 3.10 `ui/Toast`
- ✅ 3.11 `ui/Skeleton`
- ✅ 3.12 `ui/SourceSeal` (Quellen-Siegel)
- ✅ 3.13 `ui/SwipeSlider` neu, mit Federung und Haptik
- ✅ 3.14 Seitenübergänge im Layout
- ✅ 3.15 `prefers-reduced-motion` schaltet Animationen ab
- ✅ 3.16 Kim in warmen Farben mit Blinzel- und Nick-Animation
- ✅ 3.17 Demo-Seite `/ui` zeigt alle Komponenten
- 🧪 `/ui` sieht stimmig aus, Lighthouse-Barrierefreiheit erreicht 100.

## Phase 4 – Navigation neu (½ Tag)

- ✅ 4.1 Tab-Leiste mit 4 Icons: **Heute**, **Mitmachen**, **Kim**, **Ich**
- ✅ 4.2 „Heute“ als Startseite: News und Fristen
- ✅ 4.3 „Mitmachen“: Petitionen, Ehrenamt, eigene Anträge
- ✅ 4.4 „Kim“: Chat und Fakten-Check
- ✅ 4.5 „Ich“: Profil, Mails, Entwürfe, Wirkung
- ✅ 4.6 Alte Screens zuordnen oder entfernen
- 🧪 Jeder Screen ist mit höchstens 2 Tipps erreichbar.

---

# Teil C – Konten und Einstieg

## Phase 5 – Login mit mehreren Konten (1 Tag)

- ✅ 5.1 Eigenes, schlankes Login statt Auth.js: Einmal-Links und Sitzungen in der Datenbank, nur als Hash gespeichert
- ✅ 5.2 Anmeldung per Link per E-Mail (15 Minuten gültig, einmal nutzbar)
- ✅ 5.3 Mail-Modus `console`: Der Link erscheint im Terminal, ideal für die Demo
- ✅ 5.4 Screen „Anmelden“: ein Feld für die E-Mail und den Button „Link senden“
- ✅ 5.5 Screen „Prüfe dein Postfach“ mit Kim-Animation
- ✅ 5.6 Middleware: Ohne Login geht es nur auf Start, Anmelden und Tutorial-Vorschau
- ✅ 5.7 Helfer `getUser()` für Server-Routen
- ✅ 5.8 Alle Agent-Routen prüfen das Login
- ✅ 5.9 Kontowechsel: zuletzt genutzte Konten auf dem Gerät merken (nur die E-Mail)
- ✅ 5.10 Abmelden
- ✅ 5.11 Konto löschen: löscht alle Daten der Person (DSGVO)
- ✅ 5.12 Alte localStorage-Daten beim ersten Login übernehmen
- ✅ 5.13 E2E-Test: Zwei Konten nacheinander sehen jeweils nur ihre eigenen Daten
- 🧪 Zwei Personen können sich am selben Rechner anmelden, ohne Daten zu vermischen.

## Phase 6 – Onboarding und Personalisierung (½ Tag)

- ✅ 6.1 Schritt 1: Name oder Spitzname (optional)
- ✅ 6.2 Schritt 2: PLZ oder Stadtteil, mit Auswahl für Düsseldorf
- ✅ 6.3 Schritt 3: Interessen als Icon-Kacheln (Verkehr, Bildung, Umwelt, Gesundheit, Digitales, Wohnen, Soziales …)
- ✅ 6.4 Schritt 4: Werte-Kompass (bestehende Logik, neue Optik)
- ✅ 6.5 Schritt 5: eigene E-Mail für Kopien (vorbefüllt aus dem Login)
- ✅ 6.6 Speichern in `profiles` und `settings`
- ✅ 6.7 Alles ist später unter „Ich“ änderbar
- 🧪 Nach dem Onboarding sind die Interessen gespeichert, und „Heute“ zeigt passende Inhalte.

## Phase 7 – Tutorial (½ Tag)

- ✅ 7.1 Komponente `Tutorial`: wischbare Karten mit Punkten unten
- ✅ 7.2 Karte 1: „Ich bin Kim. Ich helfe, du entscheidest.“
- ✅ 7.3 Karte 2: „Heute“, deine News, mit Siegel erklärt
- ✅ 7.4 Karte 3: „Erst du“, Mini-Feld zum Ausprobieren
- ✅ 7.5 Karte 4: Probe-Wisch am Slider, mit Konfetti
- ✅ 7.6 Karte 5: „Los geht's“
- ✅ 7.7 Überspringen auf jeder Karte
- ✅ 7.8 Läuft automatisch nach dem ersten Onboarding, Fortschritt pro Konto
- ✅ 7.9 „Tutorial wiederholen“ unter „Ich“
- ✅ 7.10 Kontext-Tipps: einmalige Kim-Sprechblase beim ersten Besuch von Mitmachen, Kim und Antrag
- 🧪 Ein neues Konto sieht das Tutorial einmal, ein zweiter Login nicht mehr.

---

# Teil D – Echte Inhalte

## Phase 8 – Quellen-Whitelist (½ Tag)

- ✅ 8.1 `data/sources/whitelist.json` anlegen, Felder: Domain, Name, Typ (amtlich/presse/faktencheck/beteiligung), Region, Feed-URL, Nutzungsbedingungen-Link, darf zusammengefasst werden (ja/nein)
- ✅ 8.2 Quellen einzeln prüfen und eintragen. Jeder Feed wird per Hand geprüft, ob er existiert und was die Bedingungen erlauben:
  - Stadt Düsseldorf: Pressemitteilungen, Ratsinformationen
  - Land NRW: Landesregierung, Landtag
  - Bund: Bundesregierung, Bundestag (inklusive Petitionen)
  - EU: Europäisches Parlament, EU-Kommission
  - Öffentlich-rechtlich: tagesschau, WDR
  - Faktenchecker: correctiv, dpa-Faktencheck, ARD-Faktenfinder
- ✅ 8.3 `core/sources/isTrusted(url)`
- ✅ 8.4 `SourceSeal` zeigt Typ und Name
- ✅ 8.5 Test: Eine Domain außerhalb der Whitelist liefert `false`
- 🧪 Jede Quelle in der App hat ein Siegel. Fremde Links werden markiert.

## Phase 9 – Echte personalisierte News (1½ Tage)

- ✅ 9.1 `core/news/fetchFeed()`: RSS/Atom lesen (Bibliothek `rss-parser`)
- ✅ 9.2 Pro Eintrag speichern: Titel, kurzer Anriss (maximal ca. 200 Zeichen), Link, Datum, Quelle
- ✅ 9.3 Duplikate über den Link erkennen
- ✅ 9.4 Abruf höchstens alle 30 Minuten beim Öffnen von „Heute“, Knopf „Aktualisieren“ und `npm run news:fetch`
- ✅ 9.5 Fehlertoleranz: Fällt ein Feed aus, laufen die anderen weiter
- ✅ 9.6 Tagging: Themen über Stichwörter (kostenlos, ohne Key), Region über die Quelle. KI-Tagging folgt optional.
- ✅ 9.7 Tags werden in der Datenbank gespeichert, damit die KI nicht bei jedem Aufruf neu läuft
- ✅ 9.8 Ranking: Interessen- und Regions-Treffer ergeben Relevanz, dazu ein Bonus für Aktualität und ein Bonus für Fristen
- ✅ 9.9 Regel 5: Sortierung nur nach Relevanz, nie nach Meinung. Die Gegenseite bleibt sichtbar.
- ✅ 9.10 Screen „Heute“: Karten mit Quelle, Siegel, Zeit, Titel und Anriss
- ✅ 9.11 Karte antippen öffnet ein Bottom-Sheet mit „Kurz erklärt“ (nur bei amtlichen Quellen), „Original lesen“, „Merken“ und „Mitmachen dazu“
- ✅ 9.12 Chip „Warum sehe ich das?“ (Interesse X, Region Y)
- ✅ 9.13 Filter-Pills nach Interessen
- ✅ 9.14 Pull-to-refresh
- ✅ 9.15 Leerer Zustand: Kim mit „Heute ist es ruhig“
- ✅ 9.16 Test: Zwei Profile mit verschiedenen Interessen bekommen eine verschiedene Reihenfolge
- 🧪 „Heute“ zeigt echte, aktuelle Nachrichten mit Quelle und Link, sortiert nach dem eigenen Profil.

## Phase 10 – Echte Petitionen und Engagement (1½ Tage)

- ✅ 10.1 Quellen recherchieren und in der Whitelist ergänzen, je mit Prüfung der Nutzungsbedingungen:
  - Petitionen beim Bundestag (laufende E-Petitionen)
  - Petitionsausschuss des Landtags NRW
  - Anregungen und Beschwerden nach § 24 GO NRW (Stadt Düsseldorf)
  - Beteiligungsverfahren der Stadt (Bürgerbeteiligung, Bebauungspläne)
  - Ehrenamtsbörsen bzw. Freiwilligenagentur in Düsseldorf
  - Optional: openPetition (nur wenn Feed oder API und Bedingungen es erlauben)
- ✅ 10.2 Pro Quelle einen Adapter in `core/opportunities/adapters/`: RSS, API oder eine gepflegte JSON-Liste mit echten Links
- ✅ 10.3 Einheitliches Format: Titel, Typ, Region, Frist, Link, Quelle, Themen
- ✅ 10.4 Abruf und Tagging wie bei den News
- ✅ 10.5 Abgelaufene Fristen ausblenden
- ✅ 10.6 Screen „Mitmachen“, oben „Für dich“: personalisierte Angebote
- ✅ 10.7 Abschnitt Petitionen: Karte mit Frist-Ring und „Auf Original-Portal mitzeichnen ↗“
- ✅ 10.8 Abschnitt Ehrenamt: Karte mit Ort, Zeitaufwand und „Kontakt aufnehmen ↗“
- ✅ 10.9 Abschnitt Beteiligungsverfahren: Karte mit Frist und „Stellungnahme schreiben“ (führt zu Phase 13)
- ✅ 10.10 „Merken“ und Fristanzeige in Tagen (Push später)
- ✅ 10.11 Hinweis im Detail: „Mitzeichnen passiert auf der offiziellen Seite. OpenMind zeichnet nie für dich.“
- ✅ 10.12 Wenn ein Portal keine maschinenlesbaren Daten bietet: eine geprüfte, von Hand gepflegte Liste mit echten Links und Datum der letzten Prüfung
- 🧪 Mitmachen zeigt echte, laufende Petitionen und Ehrenamt-Angebote. Jeder Link führt auf die richtige offizielle Seite.

---

# Teil E – Agenten

## Phase 11 – Mail-Versand (½ Tag)

- ✅ 11.1 `core/mail/` mit den Adaptern `console` und `smtp` (nodemailer)
- ✅ 11.2 Konfiguration über `.env.local` (`MAIL_MODE`, `SMTP_*`)
- ✅ 11.3 Unter „Ich“, Abschnitt E-Mail: eigene Adresse und Empfänger-Adresse, mit Label „Test-Empfänger“
- ✅ 11.4 Mail-Vorlage: Betreff, Text, Fußzeile mit „Erstellt mit OpenMind, KI-Anteil X %“
- ✅ 11.5 Vorschau-Sheet vor dem Senden
- ✅ 11.6 Senden erst nach dem Wisch-Slider, mit Kopie an die eigene Adresse
- ✅ 11.7 Eintrag in `submissions` mit Status
- ✅ 11.8 Doppelversand verhindern (Idempotenz)
- ✅ 11.9 Rate-Limit: maximal 5 Mails pro Stunde und Konto
- 🧪 Eine Mail kommt wirklich an (mit SMTP) bzw. erscheint im Terminal (Console-Modus).

## Phase 12 – Antrags-Agent (2 Tage)

- ✅ 12.1 `data/procedures/*.json`: Antrag § 24 GO NRW, Anregung, Beschwerde, Petition Landtag. Je Datei: Pflichtfelder, Hinweise, Rechtsgrundlage, Empfänger (später)
- ✅ 12.2 Verfahren erkennen per Stichwort-Regeln mit Begründung; die Nutzer*in bestätigt (KI-Variante optional)
- ✅ 12.3 Rückfragen aus den Pflichtfeldern der Verfahrens-Registry (ohne KI, immer verfügbar)
- ✅ 12.4 Agent `draft`: eigene Sätze, Antworten und Verfahren ergeben einen strukturierten Entwurf
- ✅ 12.5 Vollständigkeits-Check als feste Regel (ohne KI)
- ✅ 12.6 UI Schritt 1: „Was möchtest du verändern?“ (ein Feld)
- ✅ 12.7 UI Schritt 2, „Erst du“: 1–3 Sätze, der Weiter-Button ist bis dahin gesperrt
- ✅ 12.8 UI Schritt 3: Verfahrens-Vorschlag als Karte mit „Passt“ oder „Anderes wählen“
- ✅ 12.9 UI Schritt 4: Rückfragen als Chips oder Kurzfelder
- ✅ 12.10 UI Schritt 5: Entwurf mit Diff (schwarz für dich, grau für die KI), jeder Satz einzeln editierbar
- ✅ 12.11 UI Schritt 6: Checkliste plus automatischer Fakten-Check (Phase 14)
- ✅ 12.12 UI Schritt 7: Mail-Vorschau, Wisch-Slider, Senden
- ✅ 12.13 Fortschritts-Stepper oben
- ✅ 12.14 Zwischenspeichern nach jedem Schritt in `drafts`, Weitermachen unter „Ich“
- ✅ 12.15 Guardian prüft jeden Entwurf: keine erfundenen Fakten, kein Hass
- ✅ 12.16 E2E-Test: vom Freitext bis zur gesendeten Mail (Console)
- 🧪 Ein echter Antrag geht vom ersten Satz bis zur Mail in unter 3 Minuten.

## Phase 13 – Stellungnahmen-Agent (1 Tag)

- ✅ 13.1 Einstieg aus Beteiligungsverfahren (Phase 10.9) und aus Themen
- ✅ 13.2 „Erst du“: eigene Position
- ✅ 13.3 Das stärkste Gegenargument erscheint als Karte, mit Frage „Darauf eingehen?“ (ja oder nein)
- ✅ 13.4 Agent `draft`: Anliegen, Begründung, Vorschlag, nur mit belegten Fakten
- ✅ 13.5 Diff, Checkliste, Fakten-Check, Beipackzettel
- ✅ 13.6 Versand über Phase 11
- ✅ 13.7 E2E-Test
- 🧪 Eine Stellungnahme zu einem echten Verfahren lässt sich schreiben und versenden.

## Phase 14 – Fake-News-Checker (1½ Tage)

- ✅ 14.1 Agent `extractClaims`: Text ergibt eine Liste prüfbarer Behauptungen
- ✅ 14.2 Suche 1: in gespeicherten News und Korpus (lokal, schnell)
- ✅ 14.3 Suche 2: Live-Websuche über das Anthropic-Websuche-Tool mit `allowed_domains` aus der Whitelist
- ✅ 14.4 Agent `judge`: Behauptung und Belege ergeben ✅ belegt / ❌ widerlegt / ◐ teilweise / ❔ kein Beleg
- ✅ 14.5 Jede Bewertung braucht mindestens eine Whitelist-Quelle, sonst ❔
- ✅ 14.6 Link-Eingabe: Domain gegen die Whitelist prüfen und Siegel zeigen
- ✅ 14.7 Cache für gleiche Behauptungen (24 h)
- ✅ 14.8 Screen „Stimmt das?“ im Kim-Tab: Eingabefeld, Ergebnis als Karten mit Siegel und „Quelle öffnen“
- ✅ 14.9 In Kim: Fragen wie „Stimmt das …?“ lösen den Checker aus
- ✅ 14.10 Automatisch in Antrag und Stellungnahme vor dem Senden
- ✅ 14.11 Guardian: bewertet nur Behauptungen, nie Personen oder Meinungen
- ✅ 14.12 Tests mit 5 Beispiel-Behauptungen (wahr, falsch, unklar)
- 🧪 Eine bekannte Falschbehauptung wird mit Faktencheck-Quelle als ❌ erkannt.

## Phase 15 – Kim als Mitte (1 Tag)

- ✅ 15.1 Kim-Tab: Chat plus 3 große Karten „Etwas verändern“, „Thema verstehen“, „Stimmt das?“
- ✅ 15.2 Routing: Kim erkennt die Absicht und startet den passenden Agenten
- ⬜ 15.3 Antworten erscheinen per Streaming Wort für Wort
- ⬜ 15.4 Kurze Blasen mit „Mehr“
- ✅ 15.5 Kim kennt das Profil (Interessen und Region, keine Mail) für passende Vorschläge
- ✅ 15.6 Schwebender Kim-Button auf allen Screens
- 🧪 „Ich will, dass die Ampel länger grün ist“ im Chat führt direkt in den Antrags-Agenten.

---

# Teil F – Fertigmachen

## Phase 16 – Feinschliff „smooth“ (1 Tag)

- ✅ 16.1 Skeletons überall, wo geladen wird
- ✅ 16.2 Optimistic UI bei Merken und Speichern
- ✅ 16.3 Haptik beim Slider (Handy)
- ✅ 16.4 Konfetti in Honig-Farbe nach dem Senden
- ✅ 16.5 Swipe-Gesten auf News-Karten (merken, ausblenden)
- ✅ 16.6 Textmenge reduziert: Heute in zwei Tabs, Tipps schweben, Screen-Nummern ausgeblendet
- 🧪 Die App wirkt auf dem Handy flüssig, ohne harte Sprünge.

## Phase 17 – Sicherheit und Datenschutz (½ Tag)

- ✅ 17.1 Alle Eingaben mit zod prüfen
- ✅ 17.2 Rate-Limit auf KI-Routen
- ✅ 17.3 Keine persönlichen Daten in KI-Prompts außer Interessen und Region
- ✅ 17.4 Datenschutz-Seite: was gespeichert wird und wo
- ✅ 17.5 Personalisierung abschaltbar; Mailversand nur nach eigener Bestätigung pro Schreiben
- ✅ 17.6 Datenexport (JSON) und Konto löschen
- 🧪 Ein Sicherheits-Review ohne kritische Funde.

## Phase 18 – Tests, Doku, Demo (1 Tag)

- ✅ 18.1 Unit-Tests: Ranking, Whitelist, Guardian, Agenten-Schemas
- ✅ 18.2 E2E-Tests: Login, Tutorial, Heute, Mitmachen, Antrag, Stellungnahme, Fakten-Check
- ✅ 18.3 Lighthouse ≥ 90 auf allen Screens
- ✅ 18.4 README: Setup in 5 Befehlen
- ✅ 18.5 DEMO.md: Demo-Skript für 3 Minuten
- ✅ 18.6 ARCHITECTURE.md final
- ✅ 18.7 Screenshots für die Jury
- 🧪 Eine fremde Person kann mit dem README die App starten und die Demo durchspielen.

---

## Reihenfolge und Meilensteine

| Meilenstein | Phasen | Ergebnis |
|---|---|---|
| **M1 Fundament** | 0, 1, 2 | Stabile Basis, KI läuft |
| **M2 Look** | 3, 4 | Warme, flüssige Oberfläche |
| **M3 Konten** | 5, 6, 7 | Login, Profil, Tutorial |
| **M4 Echte Inhalte** | 8, 9, 10 | Echte News, Petitionen und Ehrenamt |
| **M5 Agenten** | 11, 12, 13, 14, 15 | Antrag, Stellungnahme, Fakten-Check, Kim |
| **M6 Fertig** | 16, 17, 18 | Demo-reif |

Geschätzt etwa **17–19 Arbeitstage**. Nach jedem Meilenstein gibt es eine Demo und Abstimmung mit dir.

## Später (nach dem MVP)

- Offizielle Empfänger-Adressen pro Kommune
- Verifizierte Absender-Domain
- Push-Benachrichtigungen für Fristen
- Weitere Städte
- Gemeinsam unterzeichnen und teilen
- Status-Rückmeldung der Verwaltung


## Offen nach dem MVP (Stand 15.11.2026)

- 15.3 Kims Antworten Wort für Wort (Streaming) und 15.4 kurze Blasen mit „Mehr“
- KI-Funktionen mit echtem API-Key einmal komplett durchspielen
- Petitionsportal des Bundestags wird am 30.12.2026 abgeschaltet; Nachfolger petition.bundestag.de einbinden, sobald erreichbar
- Land NRW liefert keinen aktuellen RSS-Feed; andere Quelle für Landesnachrichten finden
- Sicherheits-Review durch Dritte, rechtliche Prüfung der Presse-Feeds
