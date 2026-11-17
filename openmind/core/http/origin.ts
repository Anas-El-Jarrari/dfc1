import { HttpError } from './safeRoute';
export function sameOrigin(req: Request) {
  if (process.env.NODE_ENV === 'production' && !process.env.APP_URL) throw new HttpError(503, 'APP_URL muss für die geschützten Aktionen konfiguriert werden.');
  const expected = new URL(process.env.APP_URL || req.url).origin;
  if (req.headers.get('origin') !== expected) throw new HttpError(403, 'Diese Aktion ist nur aus OpenMind möglich.');
}

