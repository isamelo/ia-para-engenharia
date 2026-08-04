import { defineCollection } from 'astro:content';
import { docsLoader } from '@astrojs/starlight/loaders';
import { docsSchema } from '@astrojs/starlight/schema';
import { z } from 'astro:content';

export const collections = {
  docs: defineCollection({
    loader: docsLoader(),
    schema: docsSchema({
      extend: z.object({
        tipo: z.enum(['fichamento', 'trilha', 'playbook', 'pilot']).optional(),
        revisado_em: z.coerce.date().optional(),
        nivel_evidencia: z.enum(['forte', 'emergente', 'opiniao']).optional(),
        fonte_original: z.string().url().optional(),
        tags: z.array(z.string()).default([]),
        horas: z.number().optional(),
        autor: z.string().optional(),
      }).superRefine((data, ctx) => {
        if (data.tipo === 'fichamento') {
          if (!data.revisado_em) ctx.addIssue({ code: 'custom', message: 'fichamento requer revisado_em', path: ['revisado_em'] });
          if (!data.nivel_evidencia) ctx.addIssue({ code: 'custom', message: 'fichamento requer nivel_evidencia', path: ['nivel_evidencia'] });
          if (!data.fonte_original) ctx.addIssue({ code: 'custom', message: 'fichamento requer fonte_original', path: ['fonte_original'] });
        }
      }),
    }),
  }),
};
