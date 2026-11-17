# OpenMind MVP – Plan

## Annahmen (ohne Rückfrage getroffen)
1. **Konzeptdatei:** `OpenMind_Ideen.md` existiert nicht, stattdessen wurde `../OpenMind_Grundlage.md` (v1.1) gelesen.
2. **Farben:** Die Farbtabelle aus dem Prompt (Leinen, Salbei, Terrakotta) gilt. Der Klick-Prototyp (blau) liefert nur den **Aufbau** (Karten, Tab-Leiste, Bottom-Sheets, Wizards).
3. **Persona:** Lena, 34, Düsseldorf-Bilk (laut Prompt). Die Grundlage nennt Aylin (Garath); Lena hat Vorrang.
4. **Ohne API-Key:** KI-Screens zeigen einen klaren Hinweis plus Originalquellen. Guardian und Neutralitäts-Check haben eine **regelbasierte erste Stufe**, die auch ohne Key greift (deterministisch testbar). Mit Key folgt ein zweiter Modell-Aufruf.
5. **Persistenz:** nur `localStorage` (Schlüssel `openmind-state-v1`). „Was weiß die KI über mich?“ zeigt genau diesen Inhalt; „Löschen“ entfernt ihn.
6. **Zeit-Simulation:** Demo-Schalter „+14 Tage“ (Wirkung) und „+Antworten“ (Umfrage).
7. **Portale:** Einreichungen landen in einem simulierten Portal (Vorgangsnummer, Statusverlauf). Es wird nichts versendet.

## Architektur
- `app/api/*` – explain, weigh, ask, rephrase, neutrality, guardian (alle serverseitig)
- `lib/prompts.ts` – alle Prompts, kommentiert
- `lib/rules.ts` – regelbasierte Guardian-/Neutralitätsprüfung
- `lib/diff.ts` – Wort-Diff für Schwarz/Grau
- `components/SwipeSlider.tsx` – einzige Abgabe-Aktion (Maus, Touch, Tastatur)
- `data/topics/*.json` – 5 Themen mit je 3–6 Quellen-Snippets

## Reihenfolge
1. Grundgerüst, Tokens, Tab-Leiste · 2. Daten · 3. Kim · 4. Pfad A · 5. Pfade B–E · 6. Ich/Engagieren/Stimme · 7. Tests · 8. Doku
