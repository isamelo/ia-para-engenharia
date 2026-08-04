// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  site: 'https://isamelo.github.io',
  base: '/ia-para-engenharia',
  integrations: [
    starlight({
      title: 'IA para Engenharia',
      defaultLocale: 'root',
      locales: {
        root: { label: 'Português', lang: 'pt-BR' },
      },
      social: [
        {
          icon: 'github',
          label: 'GitHub',
          href: 'https://github.com/isamelo/ia-para-engenharia',
        },
      ],
      customCss: ['./src/styles/global.css'],
      sidebar: [
        {
          label: 'Comece aqui',
          items: [{ label: 'Comece aqui', slug: 'comece-aqui' }],
        },
        {
          label: 'Trilhas',
          items: [
            { label: 'Índice de trilhas', slug: 'trilhas' },
            { autogenerate: { directory: 'trilhas' } },
          ],
        },
        {
          label: 'Playbooks',
          items: [
            { label: 'Índice de playbooks', slug: 'playbooks' },
            { autogenerate: { directory: 'playbooks' } },
          ],
        },
        {
          label: 'Fichamentos',
          items: [{ autogenerate: { directory: 'fichamentos' } }],
        },
        {
          label: 'Ferramentas',
          items: [{ label: 'Matriz de ferramentas', slug: 'ferramentas' }],
        },
        {
          label: 'Biblioteca de prompts',
          items: [{ label: 'Biblioteca de prompts', slug: 'prompts' }],
        },
        {
          label: 'Referência',
          items: [
            { label: 'Glossário', slug: 'glossario' },
            { label: 'Guia de tradução', slug: 'guia-de-traducao' },
          ],
        },
        {
          label: 'Laboratório',
          items: [{ label: 'Laboratório de componentes', slug: 'laboratorio' }],
        },
      ],
    }),
    react(),
  ],

  vite: {
    plugins: [tailwindcss()],
  },
});