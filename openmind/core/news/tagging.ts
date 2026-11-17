/** Interest keywords. Matching is on word starts, so "Rad" finds "Radweg" but not "Grad". */
export const INTEREST_KEYWORDS: Record<string, string[]> = {
  Verkehr: ['Verkehr', 'Rad', 'Fahrrad', 'Bahn', 'Bus', 'ÖPNV', 'Straße', 'Auto', 'Mobilität', 'Rheinbahn', 'Parken', 'Ampel', 'Tempo', 'Brücke', 'Deutschlandticket'],
  Kinder: ['Kind', 'Kita', 'Familie', 'Eltern', 'Jugend', 'Spielplatz', 'Ganztag', 'Baby', 'Schüler'],
  Klima: ['Klima', 'Umwelt', 'Baum', 'Bäume', 'Energie', 'Hitze', 'Grün', 'Natur', 'CO2', 'Wärme', 'Solar', 'Platane', 'Hochwasser', 'Tierschutz'],
  Wohnen: ['Wohn', 'Miet', 'Bau', 'Quartier', 'Stadtteil', 'Grundsteuer', 'Obdach', 'Wohnungs'],
  Arbeit: ['Arbeit', 'Job', 'Lohn', 'Rente', 'Beschäftig', 'Tarif', 'Fachkräft', 'Ausbildung', 'Wirtschaft', 'Bürgergeld', 'Mindestlohn'],
  Bildung: ['Schul', 'Bildung', 'Universität', 'Hochschul', 'Studi', 'Lehrer', 'Bibliothek', 'Weiterbildung'],
  Gesundheit: ['Gesundheit', 'Pflege', 'Kranken', 'Klinik', 'Arzt', 'Ärzt', 'Medizin', 'Impf', 'Apothek', 'Notaufnahme'],
  Technologie: ['Digital', 'KI', 'Künstliche Intelligenz', 'Internet', 'Daten', 'Cyber', 'Software', 'Online', 'Breitband', 'App'],
};

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const PATTERNS = Object.entries(INTEREST_KEYWORDS).map(([topic, words]) => [topic, new RegExp(`(^|[^\\p{L}])(${words.map(escape).join('|')})`, 'iu')] as const);

/** Topics a text is about, from the interest keywords. Fast and free; works without an API key. */
export function tagTopics(text: string) {
  return PATTERNS.filter(([, re]) => re.test(text)).map(([topic]) => topic);
}
