import type { KimPose } from '@/components/Kim';
import type { GuardianResult } from '@/lib/types';

export type KimMsg = {
  role: 'assistant';
  content: string;
  sources?: { topicId: string; id: string }[];
  links?: { label: string; href: string }[];
  pose?: KimPose;
  guardian?: GuardianResult;
  notice?: boolean;
};

/**
 * Recognises the two most common wishes without the AI, so they work even offline:
 * checking a claim and wanting to change something. Returns Kim's answer or undefined.
 */
export function routeIntent(text: string): KimMsg | undefined {
  const t = text.trim();
  if (/^(stimmt (das|es)|ist (das|es) (wahr|richtig)|fake|faktencheck)\b|stimmt (das|es)\??$/i.test(t)) {
    const claim = t.replace(/^(stimmt (das|es)|ist (das|es) (wahr|richtig)|fake|faktencheck)[:,]?\s*(dass\s*)?/i, '').replace(/,?\s*stimmt (das|es)\??$/i, '').trim();
    return { role: 'assistant', pose: 'search', content: 'Das prüfe ich im Fakten-Check, nur mit geprüften Quellen.', links: [{ label: 'Jetzt prüfen', href: `/check?text=${encodeURIComponent(claim || t)}` }] };
  }
  if (/\b(ich (will|möchte|wünsche mir)|wir (brauchen|wollen)|(antrag|petition|beschwerde|anregung) (stellen|starten|schreiben|einreichen))\b/i.test(t)) {
    return { role: 'assistant', pose: 'listen', content: 'Daraus machen wir zusammen ein Schreiben. Du schreibst zuerst, ich helfe, und senden tust nur du.', links: [{ label: 'Schreiben starten', href: `/mitmachen/antrag?text=${encodeURIComponent(t.slice(0, 120))}` }] };
  }
  return undefined;
}

