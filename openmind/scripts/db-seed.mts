import { db } from '../core/db/client';
import * as schema from '../core/db/schema';

// Two demo accounts so the multi-user behaviour can be tried right away.
const people = [
  { email: 'anna@example.org', name: 'Anna', district: 'Bilk', postalCode: '40223', interests: ['verkehr', 'umwelt'], values: ['Sicherheit', 'Nachhaltigkeit'] },
  { email: 'ben@example.org', name: 'Ben', district: 'Flingern', postalCode: '40233', interests: ['bildung', 'digitales'], values: ['Fairness', 'Freiheit'] },
];

for (const p of people) {
  const [user] = await db.insert(schema.users).values({ email: p.email, name: p.name })
    .onConflictDoUpdate({ target: schema.users.email, set: { name: p.name } }).returning();
  const profile = { userId: user.id, district: p.district, postalCode: p.postalCode, interests: p.interests, values: p.values };
  await db.insert(schema.profiles).values(profile).onConflictDoUpdate({ target: schema.profiles.userId, set: profile });
  await db.insert(schema.settings).values({ userId: user.id, ownEmail: p.email }).onConflictDoNothing();
}
console.log(`${people.length} Demo-Konten angelegt: ${people.map((p) => p.email).join(', ')}`);

process.exit(0);
