import { z } from 'zod';
import { guardian } from '@/core/guardian';
import { defineAgent } from './types';

export default defineAgent({
  name: 'guardian',
  needsKey: false,
  input: z.object({ text: z.string().default('') }),
  run: ({ text }) => guardian(text),
});
