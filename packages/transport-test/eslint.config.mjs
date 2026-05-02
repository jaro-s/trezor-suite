import { eslint } from '@trezor/eslint';

export default [
    ...eslint,
    {
        rules: {
            'no-nested-ternary': 'off', // useful in tests...
            'no-console': 'off',
        },
    },
    {
        // Manual / ad-hoc test scripts (manual-kv-test.ts and helpers) live
        // outside e2e/ but are test-only and may import workspace devDependencies.
        files: ['scripts/**/*.{ts,tsx}'],
        rules: {
            'import/no-extraneous-dependencies': 'off',
        },
    },
];
