import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        coverage: {
            provider: 'v8',
            include: ['nodes/**/*.ts', 'credentials/**/*.ts'],
            reporter: ['text', 'lcov'],
            // Ogni ramo di execute() e raggiungibile costruendo un contesto
            // n8n finto: qui il 100% e verificabile, non una posa. La soglia
            // impedisce che un'operazione nuova entri senza prove.
            thresholds: { statements: 100, branches: 100, functions: 100, lines: 100 },
        },
    },
});
