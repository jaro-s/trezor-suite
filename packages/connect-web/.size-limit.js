const ignore = [
    'react',
    'react-native',
    'crypto',
    'stream',
    'fs',
    'path',
    'os',
    'http',
    'https',
    'zlib',
    'buffer',
    'util',
];

module.exports = [
    {
        name: 'ESM entry (gzipped)',
        path: 'libESM/index.mjs',
        limit: '155 KB',
        gzip: true,
        ignore,
    },
    {
        name: 'CJS entry (gzipped)',
        path: 'lib/index.js',
        limit: '230 KB',
        gzip: true,
        ignore,
    },
];
