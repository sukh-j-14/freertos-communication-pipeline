import { cp, mkdir, rm } from 'node:fs/promises';
await rm('dist', { recursive: true, force: true });
await mkdir('dist', { recursive: true });
await cp('web', 'dist', { recursive: true });
await cp('results', 'dist/results', { recursive: true });
console.log('Built browser companion in dist/');
