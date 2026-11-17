import { beforeEach, vi } from 'vitest';
process.env.DATABASE_URL = 'file::memory:';
process.env.APP_URL = 'http://localhost:3000';
process.env.MAIL_MODE = 'console';
beforeEach(() => {
  // Unit/integration tests must explicitly simulate every HTTP call. Never reach Gmail or any real model.
  vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('Network disabled in automated tests'); }));
});

