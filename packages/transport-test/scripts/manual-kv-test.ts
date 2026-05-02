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
 * The script walks Add(alice) -> Add(bob) -> Add(carol) -> Update(alice)
 * -> Delete(carol), exercising the SMT against a non-trivial multi-leaf
 * tree. Each transition is auto-approved via DebugLink (with a 2s pause
 * so a viewer can read the dialog).
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
    KvSparseTree,
    type KvSparseTreeProof,
    recordCommitment,
    headHash as smtHeadHash,
} from './kvSmt';
import { awaitNonButton, expectResponse, pressYes, thpBootstrap } from './thpBootstrap';

const MNEMONIC12 = 'alcohol woman abuse must during monitor noble actual mixed trade anger aisle';

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
    console.log(`[1/9] Connecting to emulator on udp:127.0.0.1:${port} ...`);

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

    console.log('[2/9] THP bootstrap (SkipPairing) ...');
    console.log('      >>> "Connect this host?" prompt — auto-pressed via DebugLink');
    const thpState = await thpBootstrap({ transport, session, onButton });
    console.log('      THP channel paired');

    const tcall = (name: string, data: Record<string, unknown>) =>
        transport.call({ session, name, data, protocol: protocolV2, thpState });

    console.log('[3/9] Load device + create seeded session ...');
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

    // Demo data: 3 keys with successive values. We'll Add all three, then
    // Update one, then Delete one — exercising the SMT's multi-leaf path
    // (sibling hashes for inclusion / absence proofs against a non-trivial
    // tree).
    type Slot = { key: string; rid: Buffer };
    const fetchRid = async (key: string): Promise<Slot> => {
        const r = expectResponse(await tcall('KvGetRecordId', { key }), 'KvRecordId') as {
            record_id: string;
        };

        return { key, rid: fromHex(r.record_id) };
    };
    const slotAlice = await fetchRid('alice');
    const slotBob = await fetchRid('bob');
    const slotCarol = await fetchRid('carol');

    const tree = new KvSparseTree();
    let prevHead: KvHeadHex = {
        schema_version: 1,
        seq: 0,
        records_root: hex(EMPTY_HASHES[0]),
        prev_head_hash: '',
        signature: '',
    };
    let prevHeadHash = hex(computeHeadHash(prevHead));
    const chainHashes: Array<{ label: string; hash: string; root: string }> = [
        { label: 'genesis', hash: prevHeadHash, root: hex(EMPTY_HASHES[0]) },
    ];

    /**
     * Send one KvSignTransition, mutate the local tree to match, and print a
     * detailed before/after with inline ✓ chain checks. Returns the new head.
     */
    const runTransition = async (
        stepLabel: string,
        opLabel: string,
        op: 'KvOperation_Add' | 'KvOperation_Update' | 'KvOperation_Delete',
        slot: Slot,
        oldValue: string | undefined,
        newValue: string | undefined,
    ): Promise<void> => {
        // Build proof against current tree state, then mutate the tree to
        // reflect what the device will commit to. The proof we send must
        // describe the tree BEFORE the change.
        const proof: KvSparseTreeProof = tree.proof(slot.rid);

        let proposedRoot: Buffer;
        if (op === 'KvOperation_Add') {
            if (proof.exists) throw new Error(`Add: ${slot.key} already in tree`);
            const commitment = recordCommitment(slot.rid, slot.key, newValue!);
            tree.insert(slot.rid, commitment);
            proposedRoot = tree.root();
        } else if (op === 'KvOperation_Update') {
            if (!proof.exists) throw new Error(`Update: ${slot.key} not in tree`);
            const commitment = recordCommitment(slot.rid, slot.key, newValue!);
            tree.insert(slot.rid, commitment);
            proposedRoot = tree.root();
        } else {
            if (!proof.exists) throw new Error(`Delete: ${slot.key} not in tree`);
            tree.delete(slot.rid);
            proposedRoot = tree.root();
        }

        console.log(`${stepLabel} ${opLabel} transition`);
        console.log(`      key           = "${slot.key}"`);
        if (oldValue !== undefined) console.log(`      old value     = "${oldValue}"`);
        if (newValue !== undefined) console.log(`      new value     = "${newValue}"`);
        console.log(`      record_id     = ${hex(slot.rid)}`);
        console.log(
            `      proof         = ${proof.exists ? 'inclusion' : 'absence'} (siblings=${proof.siblingHashes.length})`,
        );
        if (proof.leafHash) console.log(`      proof leaf_hash = ${hex(proof.leafHash)}`);
        console.log(`      proposed root = ${hex(proposedRoot)}`);
        console.log(`      old head      = seq=${prevHead.seq}, head_hash=${prevHeadHash}`);
        console.log(`      sending KvSignTransition{${op}} ...`);

        const res = await awaitNonButton(
            await tcall('KvSignTransition', {
                operation: op,
                key: slot.key,
                old_head: prevHead,
                old_value: oldValue,
                new_value: newValue,
                proof: {
                    leaf_key: hex(slot.rid),
                    leaf_hash: proof.leafHash ? hex(proof.leafHash) : undefined,
                    sibling_hashes: proof.siblingHashes.map(hex),
                    sibling_bitmap: hex(proof.siblingBitmap),
                    exists: proof.exists,
                },
                proposed_new_root: hex(proposedRoot),
            }),
            tcall,
            onButton,
        );
        const newHead = (expectResponse(res, 'KvSignedTransition') as { new_head: KvHeadHex })
            .new_head;
        prevHeadHash = printSigned(opLabel, prevHeadHash, newHead, hex(proposedRoot));
        prevHead = newHead;
        chainHashes.push({ label: opLabel, hash: prevHeadHash, root: newHead.records_root });
    };

    await runTransition(
        '[4/9]',
        'Add(alice)',
        'KvOperation_Add',
        slotAlice,
        undefined,
        'value-alice',
    );
    await runTransition('[5/9]', 'Add(bob)', 'KvOperation_Add', slotBob, undefined, 'value-bob');
    await runTransition(
        '[6/9]',
        'Add(carol)',
        'KvOperation_Add',
        slotCarol,
        undefined,
        'value-carol',
    );
    await runTransition(
        '[7/9]',
        'Update(alice)',
        'KvOperation_Update',
        slotAlice,
        'value-alice',
        'value-alice-v2',
    );
    await runTransition(
        '[8/9]',
        'Delete(carol)',
        'KvOperation_Delete',
        slotCarol,
        'value-carol',
        undefined,
    );

    // ─── [9/9] Final summary ────────────────────────────────────────────────
    console.log('[9/9] Final verification');
    const auth = expectResponse(await tcall('KvGetAuthority', {}), 'KvAuthority') as {
        public_key: string;
        schema_version: number;
    };
    console.log(`      authority public_key = ${auth.public_key}`);
    console.log(
        `        (uncompressed secp256k1; verify each head's signature with this key + head_hash above)`,
    );
    console.log('      chain summary:');
    for (const { label, hash, root } of chainHashes) {
        console.log(`        ${label.padEnd(14)} head_hash=${hash}  root=${root.slice(0, 12)}…`);
    }
    // After Add(alice)+Add(bob)+Add(carol)+Update(alice)+Delete(carol) the tree
    // holds {alice (v2), bob} — locally we expect that root, and the device's
    // last records_root must agree.
    const expectedFinalRoot = hex(tree.root());
    if (prevHead.records_root !== expectedFinalRoot) {
        throw new Error(
            `final records_root mismatch: device says ${prevHead.records_root}, local tree says ${expectedFinalRoot}`,
        );
    }
    console.log(`      expected final root = ${expectedFinalRoot}  ✓ device agrees`);

    console.log('\nAll five transitions accepted, chained, and signed by device.');

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
