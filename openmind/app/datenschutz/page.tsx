import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';

const ROWS: [string, string, string][] = [
  ['Konto', 'E-Mail, Name (freiwillig)', 'Server-Datenbank'],
  ['Profil', 'Stadtteil, Interessen, Werte, Barrierefreiheit', 'Server-Datenbank'],
  ['Schreiben', 'Entwürfe, gesendete Schreiben, Empfänger', 'Server-Datenbank'],
  ['Recherche und Gmail', 'Quellen, Prüfungen, Versandstatus; Gmail-Freigabe verschlüsselt', 'Server-Datenbank'],
  ['Gemerkt', 'Gemerkte News und Angebote', 'Server-Datenbank'],
  ['Tendenzen & Chat', 'Deine Tendenzen, Fragen an Kim', 'Nur in deinem Browser'],
];

/** Plain-language privacy overview. Public, so people can read it before signing in. */
export default function Datenschutz() {
  return (
    <div className="px-4 pt-5 pb-28 grid grid-cols-[minmax(0,1fr)] gap-4">
      <div className="flex items-center gap-2">
        <Link href="/ich" className="icon-btn" aria-label="Zurück"><ChevronLeft aria-hidden /></Link>
        <h1 className="text-2xl">Datenschutz</h1>
      </div>
      <p className="card font-semibold">Wir speichern nur, was die App zum Funktionieren braucht. Keine Werbung, kein Verkauf, kein Tracking.</p>

      <h2 className="text-xl">Was wo liegt</h2>
      <div className="card grid gap-3">
        {ROWS.map(([what, detail, where]) => (
          <div key={what} className="grid gap-0.5">
            <strong>{what}</strong>
            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{detail}</span>
            <span className="chip w-fit" style={{ background: where.startsWith('Nur') ? 'var(--sage-bg)' : 'var(--muted)', color: where.startsWith('Nur') ? 'var(--sage)' : 'var(--text-secondary)' }}>{where}</span>
          </div>
        ))}
      </div>

      <h2 className="text-xl">Die KI</h2>
      <ul className="card grid gap-2 text-sm">
        <li>• Ollama verarbeitet dein Anliegen, deinen Profilstandort, Quellen und gegebenenfalls deinen Namen auf dem eingerichteten lokalen Rechner.</li>
        <li>• Für Webrecherchen gehen Suchbegriffe über SearXNG an Suchmaschinen. Die App ruft außerdem öffentliche Quellseiten auf.</li>
        <li>• Die KI bereitet mögliche Schritte vor und zeigt Gegenargumente. Sie bestätigt keinen Versand und unterschreibt nicht selbst.</li>
      </ul>

      <h2 className="text-xl">E-Mails</h2>
      <p className="card text-sm">Nach deiner Prüfung und ausdrücklichen Bestätigung sendet dein verbundenes Gmail-Konto den angezeigten Text direkt an den belegten Empfänger. Google verarbeitet dabei E-Mail-Inhalt und Empfänger. Die Verbindung lässt sich unter „Ich“ trennen; die Google-Freigabe kannst du zusätzlich in deinem Google-Konto widerrufen.</p>

      <h2 className="text-xl">Deine Rechte</h2>
      <ul className="card grid gap-2 text-sm">
        <li>• <strong>Auskunft und Mitnahme:</strong> Unter „Ich“ lädst du alle deine Daten als Datei herunter.</li>
        <li>• <strong>Löschen:</strong> Unter „Ich“ löschst du dein Konto mit allen Daten sofort.</li>
        <li>• <strong>Personalisierung aus:</strong> Unter „Ich“ → Einwilligungen. Dann sortieren wir nur nach Aktualität.</li>
      </ul>
      <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Prototyp für die Digital Future Challenge. Vor einem öffentlichen Start braucht es eine geprüfte Datenschutzerklärung mit Verantwortlichen und Auftragsverarbeitern.</p>
    </div>
  );
}
