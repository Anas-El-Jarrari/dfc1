import { createClient } from '@libsql/client';
const c = createClient({ url: 'file:.data/openmind.db' });
const r = await c.execute('select source, count(*) n, max(published_at) last from news_items group by source');
console.table(r.rows);
const t = await c.execute("select source, title, topics, substr(teaser,1,60) t from news_items order by published_at desc limit 8");
console.table(t.rows);
c.close();
