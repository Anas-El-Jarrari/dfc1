// WCAG AA contrast check for every text/background pair used in the UI.
const pairs = [
  ['Text auf Creme', '#3B2F2A', '#FBF6EF'], ['Sekundär auf Creme', '#75665C', '#FBF6EF'], ['Sekundär auf Weiß', '#75665C', '#FFFFFF'],
  ['Sekundär auf Sand', '#75665C', '#F4ECE1'], ['Weiß auf Terrakotta', '#FFFFFF', '#A84F33'], ['Terrakotta auf Creme', '#A84F33', '#FBF6EF'],
  ['Terrakotta auf Weiß', '#A84F33', '#FFFFFF'], ['Terrakotta auf Terrakotta-hell', '#A84F33', '#F9E7DC'],
  ['Pro auf Pro-Fläche', '#3F6B55', '#E3EEE6'], ['Contra-Text auf Contra-Fläche', '#7A5E14', '#FBF0D2'],
  ['Text auf Pro-Fläche', '#3B2F2A', '#E3EEE6'], ['Text auf Contra-Fläche', '#3B2F2A', '#FBF0D2'],
  ['Stadt-Chip', '#3F6B55', '#E3EEE6'], ['Land-Chip', '#6E4A7E', '#F1EAF3'], ['Bund-Chip', '#35627F', '#E4EDF2'], ['EU-Chip', '#7A5E14', '#FBF0D2'],
  ['Ampel grün auf Weiß', '#4E7D3A', '#FFFFFF'], ['Ampel gelb (Text) auf Weiß', '#7A5E14', '#FFFFFF'], ['Ampel rot auf Weiß', '#A8432F', '#FFFFFF'],
  ['Ampel grün auf Creme', '#4E7D3A', '#FBF6EF'], ['Ampel gelb (Text) auf Creme', '#7A5E14', '#FBF6EF'], ['Ampel rot auf Creme', '#A8432F', '#FBF6EF'],
  ['Weiß auf Ampel rot', '#FFFFFF', '#A8432F'], ['Demo-Schalter', '#92400E', '#FEF3C7'], ['Toast', '#FBF6EF', '#3B2F2A'],
  ['Tab aktiv', '#A84F33', '#F9E7DC'], ['Tab inaktiv auf Weiß', '#75665C', '#FFFFFF'],
];
const lum = (hex) => {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
let fail = 0;
for (const [name, fg, bg] of pairs) {
  const [a, b] = [lum(fg), lum(bg)].sort((x, y) => y - x);
  const r = (a + 0.05) / (b + 0.05);
  const ok = r >= 4.5;
  if (!ok) fail++;
  console.log(`${ok ? 'OK  ' : 'FAIL'} ${r.toFixed(2)}:1  ${name}`);
}
process.exit(fail ? 1 : 0);
