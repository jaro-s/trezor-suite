// Shared tsdown config factory for @trezor/* publishable packages.
// Produces the dual CJS (lib/) + ESM (libESM/) layout the monorepo publishes,
// with @trezor/* workspace deps left external (so consumers resolve them via
// their own node_modules, not bundled in).
//
// Two output modes:
//   bundled  — explicit entries get a Rollup-style bundle with chunk splitting
//              (industry standard for libraries with a fixed public API).
//   unbundle — every src/**/*.ts is transpiled to its mirrored lib/**/*.js
//              (preserves file-by-file structure for packages whose
//              package.json exports include wildcard subpaths like `./lib/*`).
//
// Devdep type leaks (@trezor/* packages used as devDependencies whose types
// surface in the public API) are bundled into the emitted .d.ts via tsdown's
// `dts.resolve` — replaces the legacy inline-devdep-types.mjs script.
//
// Usage:
//   import { createConfig } from '../../scripts/build/tsdown.shared.mjs';
//   export default createConfig({ entry: ['src/index.ts'] });
//   export default createConfig({ unbundle: true });
//   export default createConfig({ unbundle: true, inlineDevDepTypes: true });

import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { defineConfig } from 'tsdown';

const POST_BUILD_SCRIPT = resolve(import.meta.dirname, 'post-build.mjs');
const INLINE_DEVDEP_TYPES_SCRIPT = resolve(import.meta.dirname, '..', 'inline-devdep-types.mjs');

const DEFAULT_UNBUNDLE_GLOB = [
    'src/**/*.ts',
    '!src/**/*.test.ts',
    '!src/**/__tests__/**',
    '!src/**/__fixtures__/**',
    '!src/**/__mocks__/**',
];

/**
 * @param {object} options
 * @param {string|string[]} [options.entry] - Bundled mode: explicit entry points.
 * @param {boolean} [options.unbundle] - Unbundle mode: transpile every src/**\/*.ts file 1:1.
 * @param {string[]} [options.unbundleEntry] - Override the default unbundle glob.
 * @param {boolean} [options.inlineDevDepTypes] - Bundle @trezor/* devDependency type
 *   declarations into the emitted .d.ts so the published package is self-contained.
 */
export function createConfig({
    entry,
    unbundle = false,
    unbundleEntry,
    inlineDevDepTypes = false,
}) {
    if (!entry && !unbundle) {
        throw new Error('createConfig: either `entry` or `unbundle: true` is required');
    }
    if (entry && unbundle) {
        throw new Error('createConfig: `entry` and `unbundle` are mutually exclusive');
    }

    const external = buildExternals(process.cwd());

    const baseShared = {
        entry: unbundle ? (unbundleEntry ?? DEFAULT_UNBUNDLE_GLOB) : entry,
        unbundle,
        external,
        clean: true,
        sourcemap: false,
        target: 'es2022',
        platform: 'neutral',
        dts: { sourcemap: false },
    };

    return defineConfig([
        {
            ...baseShared,
            format: 'cjs',
            outDir: 'lib',
            outExtensions: () => ({ js: '.js', dts: '.d.ts' }),
            onSuccess: postBuildHook('lib', 'cjs', inlineDevDepTypes),
        },
        {
            ...baseShared,
            format: 'esm',
            outDir: 'libESM',
            outExtensions: () => ({ js: '.mjs', dts: '.d.mts' }),
            onSuccess: postBuildHook('libESM', 'esm', inlineDevDepTypes),
        },
    ]);
}

// Find @trezor/* packages that are in devDependencies but NOT in prod or peer
// dependencies — these are the type leaks the published package needs to inline.
function detectDevDepLeaks(packageRoot) {
    const pkg = JSON.parse(readFileSync(resolve(packageRoot, 'package.json'), 'utf8'));
    const prodClosure = new Set([
        ...Object.keys(pkg.dependencies ?? {}),
        ...Object.keys(pkg.peerDependencies ?? {}),
    ]);
    return Object.keys(pkg.devDependencies ?? {}).filter(
        dep => dep.startsWith('@trezor/') && !prodClosure.has(dep),
    );
}

// Externalize prod + peer + optional dependencies (what consumers will have
// installed) plus all @trezor/* workspace packages (devDep leaks are vendored
// post-build via inline-devdep-types.mjs, so the dts plugin must not try to
// resolve them through workspace src/ files which would break tsc references).
function buildExternals(packageRoot) {
    const pkg = JSON.parse(readFileSync(resolve(packageRoot, 'package.json'), 'utf8'));
    const deps = [
        ...Object.keys(pkg.dependencies ?? {}),
        ...Object.keys(pkg.peerDependencies ?? {}),
        ...Object.keys(pkg.optionalDependencies ?? {}),
    ];
    return [
        ...deps.flatMap(dep => [dep, new RegExp(`^${escapeRegExp(dep)}/`)]),
        /^@trezor\//,
    ];
}

function escapeRegExp(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function postBuildHook(outDirName, mode, inlineDevDepTypes) {
    return () => {
        execSync(`node "${POST_BUILD_SCRIPT}" "./${outDirName}" ${mode}`, {
            stdio: 'inherit',
            cwd: process.cwd(),
        });
        if (inlineDevDepTypes) {
            // inline-devdep-types.mjs reads libDev/ from upstream workspace
            // packages. Those are produced by the `type-check` nx target,
            // which build:lib now depends on (^type-check in nx.json).
            execSync(`node "${INLINE_DEVDEP_TYPES_SCRIPT}"`, {
                stdio: 'inherit',
                cwd: process.cwd(),
                env: { ...process.env, DTS_OUT_DIR: outDirName },
            });
        }
    };
}
