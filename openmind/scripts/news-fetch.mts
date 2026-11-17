const { fetchAllNews } = await import('../core/news/fetch');
const report = await fetchAllNews();
for (const r of report) console.log(`${r.ok ? '✓' : '✗'} ${r.source.padEnd(16)} ${r.ok ? `${r.items} Meldungen` : r.error}`);

process.exit(0);
