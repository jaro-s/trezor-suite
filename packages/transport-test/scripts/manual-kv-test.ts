/**
 * Manual KvSignTransition demo against a running Trezor T3W1 emulator
 * (debug build, THP wire protocol).
 *
 * Talks to @trezor/transport directly using:
 *   - thpBootstrap.ts to establish a paired THP channel via SkipPairing
 *   - kvSmt.ts for SMT primitives matching the firmware
 *
 * Prerequisites:
 *   1. Build the unix emulator from /tmp/trezor-pr12 (or a checked-out
 *      PR #12 worktree). Default model is T3W1, default THP=1.
 *   2. Start the emulator on a non-default port to avoid clashing with
 *      an existing test_emu run on 21324:
 *
 *        cd /tmp/trezor-pr12 && TREZOR_UDP_PORT=21424 \
 *          UV_CACHE_DIR=/tmp/uv-cache uv run core/emu.py --temporary-profile
 *
 *   3. From the trezor-suite root:
 *
 *        TREZOR_UDP_PORT=21424 yarn tsx \
 *          packages/transport-test/scripts/manual-kv-test.ts
 *
 * The script walks Add -> Update -> Delete. For each step you must
 * approve the prompt on the SDL window (or click No to test cancel).
 */
import { protobufManager } from '@trezor/protobuf';
import * as commonProto from '@trezor/protobuf/src/definitions/messages-common_pb';
import * as cryptoProto from '@trezor/protobuf/src/definitions/messages-crypto_pb';
import * as debugProto from '@trezor/protobuf/src/definitions/messages-debug_pb';
import * as managementProto from '@trezor/protobuf/src/definitions/messages-management_pb';
import * as thpProto from '@trezor/protobuf/src/definitions/messages-thp_pb';
import * as messagesProto from '@trezor/protobuf/src/definitions/messages_pb';
import { v2 as protocolV2 } from '@trezor/protocol';
import { UdpTransport } from '@trezor/transport';
import type { Session } from '@trezor/transport/src/types';

import {
    EMPTY_HASHES,
    leafHash,
    recordCommitment,
    rootForSingleLeaf,
    headHash as smtHeadHash,
} from './kvSmt';
import { awaitNonButton, expectResponse, pressYes, thpBootstrap } from './thpBootstrap';

const MNEMONIC12 = 'alcohol woman abuse must during monitor noble actual mixed trade anger aisle';
const EMPTY_BITMAP = Buffer.alloc(32);

// Time the script keeps the dialog visible on the SDL window before pressing
// YES via DebugLink. Long enough that a human watching can read what they're
// "approving"; short enough that the test still feels snappy.
const BUTTON_PRESS_DELAY_MS = 2000;

const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

const hex = (b: Buffer) => b.toString('hex');
const fromHex = (s: string | undefined) =>
    !s || s.length === 0 ? Buffer.alloc(0) : Buffer.from(s, 'hex');

type KvHeadHex = {
    schema_version: number;
    seq: number;
    records_root: string;
    prev_head_hash?: string;
    signature: string;
};

const computeHeadHash = (head: KvHeadHex) =>
    smtHeadHash(
        head.schema_version,
        head.seq,
        fromHex(head.records_root),
        fromHex(head.prev_head_hash),
    );

/**
 * Print the just-signed head and its derived head_hash, with inline assertions
 * showing that:
 *   - records_root equals the `proposed_new_root` we sent in the request
 *     (the device computed the same root from our SMT proof)
 *   - prev_head_hash equals the head_hash of the previous step
 *     (the chain is continuous)
 * Throws on mismatch so the script can't silently disagree with the device.
 * Returns the new head's head_hash so the next step can pass it in as
 * `expectedPrev`.
 */
const printSigned = (
    label: string,
    expectedPrev: string,
    head: KvHeadHex,
    proposedRoot: string,
): string => {
    const headHashBytes = computeHeadHash(head);
    const headHashHex = hex(headHashBytes);
    const rootOk = head.records_root === proposedRoot;
    const prevOk = (head.prev_head_hash ?? '') === expectedPrev;
    console.log(`      [SIGNED ${label}] seq=${head.seq}`);
    console.log(
        `        records_root   = ${head.records_root}  ${rootOk ? '✓ matches proposed_new_root' : '✗ MISMATCH (sent ' + proposedRoot + ')'}`,
    );
    console.log(
        `        prev_head_hash = ${head.prev_head_hash ?? '(empty)'}  ${prevOk ? '✓ chains from previous head' : '✗ MISMATCH (expected ' + expectedPrev + ')'}`,
    );
    console.log(
        `        signature      = ${head.signature.slice(0, 32)}... (secp256k1 over head_hash by device KV authority)`,
    );
    console.log(`        head_hash      = ${headHashHex}  (next step's prev_head_hash)`);
    if (!rootOk) {
        throw new Error(
            `records_root mismatch after ${label}: got ${head.records_root}, sent ${proposedRoot}`,
        );
    }
    if (!prevOk) {
        throw new Error(
            `prev_head_hash mismatch after ${label}: got ${head.prev_head_hash}, expected ${expectedPrev}`,
        );
    }

    return headHashHex;
};

const main = async () => {
    protobufManager.load([
        commonProto,
        messagesProto,
        managementProto,
        cryptoProto,
        thpProto,
        debugProto,
    ]);

    const port = Number.parseInt(process.env.TREZOR_UDP_PORT ?? '21324', 10);
    console.log(`[1/7] Connecting to emulator on udp:127.0.0.1:${port} ...`);

    const setupTransport = async (opts: { debugLink?: boolean } = {}) => {
        const t = new UdpTransport({
            id: opts.debugLink ? 'manual-kv-debug' : 'manual-kv-test',
            debugLink: opts.debugLink,
        });
        const ir = await t.init();
        if (!ir.success) throw new Error(`init failed: ${ir.error.code}`);
        t.listen();
        let d: { path: string }[] = [];
        for (let i = 0; i < 30 && d.length === 0; i++) {
            const e = await t.enumerate();
            if (!e.success) throw new Error(`enumerate: ${e.error.code}`);
            d = e.payload;
            if (d.length === 0) await new Promise(r => setTimeout(r, 200));
        }
        if (d.length === 0) {
            throw new Error(
                `no ${opts.debugLink ? 'debug ' : ''}device on port ${opts.debugLink ? port + 1 : port}`,
            );
        }
        const ar = await t.acquire({ input: { path: d[0].path as any, previous: null } });
        if (!ar.success) throw new Error(`acquire: ${ar.error.code}`);

        return { transport: t, session: ar.payload as Session, path: d[0].path };
    };

    const { transport, session, path } = await setupTransport();
    console.log(`      found device at ${path}, session=${session}`);

    const debug = await setupTransport({ debugLink: true });
    console.log(`      debug-link session=${debug.session}`);

    const onButton = async (msg: Record<string, unknown>) => {
        const code = (msg.code as string | undefined) ?? '?';
        console.log(
            `        ButtonRequest code=${code} — viewing dialog ${BUTTON_PRESS_DELAY_MS}ms ...`,
        );
        await sleep(BUTTON_PRESS_DELAY_MS);
        console.log('        DebugLink: pressing YES');
        await pressYes({ debugTransport: debug.transport, debugSession: debug.session });
    };

    console.log('[2/7] THP bootstrap (SkipPairing) ...');
    console.log('      >>> "Connect this host?" prompt — auto-pressed via DebugLink');
    const thpState = await thpBootstrap({ transport, session, onButton });
    console.log('      THP channel paired');

    const tcall = (name: string, data: Record<string, unknown>) =>
        transport.call({ session, name, data, protocol: protocolV2, thpState });

    console.log('[3/7] Load device + create seeded session ...');
    // Probe device state with Initialize. If it's already initialized (re-run
    // against a still-running emulator), skip LoadDevice — re-loading would
    // get Failure_UnexpectedMessage{Already initialized}, and on a paired THP
    // device WipeDevice would invalidate the channel (ThpUnallocatedChannel
    // on the next call). The mnemonic we'd load is the same constant so the
    // existing seed is correct for our test.
    const featuresRes = expectResponse(await tcall('GetFeatures', {}), 'Features') as {
        initialized?: boolean | null;
        label?: string | null;
    };
    if (featuresRes.initialized) {
        console.log(
            `      device already initialized (label=${featuresRes.label ?? '?'}) — reusing existing seed`,
        );
    } else {
        const loadRes = await awaitNonButton(
            await tcall('LoadDevice', {
                mnemonics: [MNEMONIC12],
                passphrase_protection: false,
                label: 'manual-kv-test',
                skip_checksum: true,
            }),
            tcall,
            onButton,
        );
        expectResponse(loadRes, 'Success');
        console.log('      device loaded with manual-kv-test seed');
    }

    // Default session 0 is "seedless" (firmware/wire/thp/session_context.py).
    // Allocate a fresh session and ask the device to derive the seed for it
    // via ThpCreateNewSession (mirrors trezorlib's TrezorClientThp._get_session).
    thpState.createNewSessionId();
    const newSessionRes = await awaitNonButton(
        await tcall('ThpCreateNewSession', { passphrase: '', derive_cardano: false }),
        tcall,
        onButton,
    );
    expectResponse(newSessionRes, 'Success');
    console.log(`      seeded session id=0x${thpState.sessionId.toString('hex')}`);

    const key = 'alice';
    const value_v1 = 'value-one';
    const value_v2 = 'value-two';

    const ridResp = expectResponse(await tcall('KvGetRecordId', { key }), 'KvRecordId') as {
        record_id: string;
    };
    const recordId = fromHex(ridResp.record_id);

    const commitment_v1 = recordCommitment(recordId, key, value_v1);
    const leaf_v1 = leafHash(recordId, commitment_v1);
    const addRoot = rootForSingleLeaf(recordId, commitment_v1);

    const commitment_v2 = recordCommitment(recordId, key, value_v2);
    const leaf_v2 = leafHash(recordId, commitment_v2);
    const updateRoot = rootForSingleLeaf(recordId, commitment_v2);

    const genesisHead: KvHeadHex = {
        schema_version: 1,
        seq: 0,
        records_root: hex(EMPTY_HASHES[0]),
        prev_head_hash: '',
        signature: '',
    };
    const genesisHash = hex(computeHeadHash(genesisHead));

    // ─── [4/7] Add ──────────────────────────────────────────────────────────
    console.log('[4/7] Add transition');
    console.log(`      key           = "${key}"`);
    console.log(`      new value     = "${value_v1}"`);
    console.log(`      record_id     = ${hex(recordId)}`);
    console.log(
        `        (HMAC-SHA256(device-secret, "kv-record-id-v1" || key) — fetched from device)`,
    );
    console.log(`      commitment    = ${hex(commitment_v1)}`);
    console.log(
        `        (sha256("kv-record-v1" || record_id || compact_size(key) || key || compact_size(value) || value))`,
    );
    console.log(`      leaf_hash     = ${hex(leaf_v1)}`);
    console.log(`      proposed root = ${hex(addRoot)}  (single-leaf SMT root)`);
    console.log(`      proof         = absence (this key has no prior leaf)`);
    console.log(`      old head      = empty tree, seq=0, head_hash=${genesisHash}`);
    console.log('      sending KvSignTransition{KvOperation_Add} ...');
    const addResp = await awaitNonButton(
        await tcall('KvSignTransition', {
            operation: 'KvOperation_Add',
            key,
            old_head: genesisHead,
            new_value: value_v1,
            proof: {
                leaf_key: hex(recordId),
                sibling_hashes: [],
                sibling_bitmap: hex(EMPTY_BITMAP),
                exists: false,
            },
            proposed_new_root: hex(addRoot),
        }),
        tcall,
        onButton,
    );
    const addHead = (expectResponse(addResp, 'KvSignedTransition') as { new_head: KvHeadHex })
        .new_head;
    const addHeadHash = printSigned('Add', genesisHash, addHead, hex(addRoot));

    // ─── [5/7] Update ───────────────────────────────────────────────────────
    console.log('[5/7] Update transition');
    console.log(`      key           = "${key}"`);
    console.log(`      old value     = "${value_v1}"  (becomes proof input)`);
    console.log(`      new value     = "${value_v2}"`);
    console.log(`      record_id     = ${hex(recordId)}  (deterministic, same as Add)`);
    console.log(`      old leaf_hash = ${hex(leaf_v1)}  (prior commitment of "${value_v1}")`);
    console.log(`      new commitment= ${hex(commitment_v2)}`);
    console.log(`      new leaf_hash = ${hex(leaf_v2)}`);
    console.log(`      proposed root = ${hex(updateRoot)}  (root after replacing leaf)`);
    console.log(`      proof         = inclusion of old leaf (empty bitmap, 0 siblings)`);
    console.log(`      old head      = seq=${addHead.seq}, head_hash=${addHeadHash}`);
    console.log('      sending KvSignTransition{KvOperation_Update} ...');
    const updResp = await awaitNonButton(
        await tcall('KvSignTransition', {
            operation: 'KvOperation_Update',
            key,
            old_head: addHead,
            old_value: value_v1,
            new_value: value_v2,
            proof: {
                leaf_key: hex(recordId),
                leaf_hash: hex(leaf_v1),
                sibling_hashes: [],
                sibling_bitmap: hex(EMPTY_BITMAP),
                exists: true,
            },
            proposed_new_root: hex(updateRoot),
        }),
        tcall,
        onButton,
    );
    const updHead = (expectResponse(updResp, 'KvSignedTransition') as { new_head: KvHeadHex })
        .new_head;
    const updHeadHash = printSigned('Update', addHeadHash, updHead, hex(updateRoot));

    // ─── [6/7] Delete ───────────────────────────────────────────────────────
    console.log('[6/7] Delete transition');
    console.log(`      key           = "${key}"`);
    console.log(`      old value     = "${value_v2}"  (becomes proof input)`);
    console.log(`      record_id     = ${hex(recordId)}`);
    console.log(`      leaf_hash     = ${hex(leaf_v2)}  (commitment being removed)`);
    console.log(`      proposed root = ${hex(EMPTY_HASHES[0])}  (back to empty tree)`);
    console.log(`      proof         = inclusion of leaf to delete`);
    console.log(`      old head      = seq=${updHead.seq}, head_hash=${updHeadHash}`);
    console.log('      sending KvSignTransition{KvOperation_Delete} ...');
    const delResp = await awaitNonButton(
        await tcall('KvSignTransition', {
            operation: 'KvOperation_Delete',
            key,
            old_head: updHead,
            old_value: value_v2,
            proof: {
                leaf_key: hex(recordId),
                leaf_hash: hex(leaf_v2),
                sibling_hashes: [],
                sibling_bitmap: hex(EMPTY_BITMAP),
                exists: true,
            },
            proposed_new_root: hex(EMPTY_HASHES[0]),
        }),
        tcall,
        onButton,
    );
    const delHead = (expectResponse(delResp, 'KvSignedTransition') as { new_head: KvHeadHex })
        .new_head;
    const delHeadHash = printSigned('Delete', updHeadHash, delHead, hex(EMPTY_HASHES[0]));

    // ─── [7/7] Final summary ────────────────────────────────────────────────
    console.log('[7/7] Final verification');
    const auth = expectResponse(await tcall('KvGetAuthority', {}), 'KvAuthority') as {
        public_key: string;
        schema_version: number;
    };
    console.log(`      authority public_key = ${auth.public_key}`);
    console.log(
        `        (uncompressed secp256k1; verify each head's signature with this key + head_hash above)`,
    );
    console.log('      chain summary:');
    console.log(`        genesis    head_hash = ${genesisHash}  (empty tree)`);
    console.log(
        `        after Add  head_hash = ${addHeadHash}  (records_root=${addHead.records_root.slice(0, 12)}…)`,
    );
    console.log(
        `        after Upd  head_hash = ${updHeadHash}  (records_root=${updHead.records_root.slice(0, 12)}…)`,
    );
    console.log(`        after Del  head_hash = ${delHeadHash}  (records_root=EMPTY_HASHES[0])`);
    if (delHead.records_root !== hex(EMPTY_HASHES[0])) {
        throw new Error(
            `delete should leave empty tree: got ${delHead.records_root}, expected ${hex(EMPTY_HASHES[0])}`,
        );
    }

    console.log('\nAll three transitions accepted, chained, and signed by device.');

    // Both transports run a recurring listenLoop that keeps Node alive — stop
    // both before exiting, and force-exit as a safety net so a hanging
    // setTimeout doesn't keep the process around.
    await transport.release({ path: path as any, session }).catch(() => {});
    await debug.transport
        .release({ path: debug.path as any, session: debug.session })
        .catch(() => {});
    transport.stop();
    debug.transport.stop();
};

main()
    .then(() => process.exit(0))
    .catch(err => {
        console.error('FAILED:', err);
        process.exit(1);
    });
