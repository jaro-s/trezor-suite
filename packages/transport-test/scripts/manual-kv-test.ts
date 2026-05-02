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

const printHead = (label: string, head: KvHeadHex) => {
    console.log(`  [${label}] schema=${head.schema_version} seq=${head.seq}`);
    console.log(`        records_root  = ${head.records_root}`);
    console.log(`        prev_head_hash= ${head.prev_head_hash ?? ''}`);
    console.log(`        signature[:8] = ${head.signature.slice(0, 16)}...`);
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

    const onButton = (msg: Record<string, unknown>) => {
        const code = (msg.code as string | undefined) ?? '?';
        console.log(
            `        ButtonRequest code=${code} -> sending ButtonAck + DebugLink press YES`,
        );

        return pressYes({ debugTransport: debug.transport, debugSession: debug.session });
    };

    console.log('[2/7] THP bootstrap (SkipPairing) ...');
    console.log('      >>> "Connect this host?" prompt — auto-pressed via DebugLink');
    const thpState = await thpBootstrap({ transport, session, onButton });
    console.log('      THP channel paired');

    const tcall = (name: string, data: Record<string, unknown>) =>
        transport.call({ session, name, data, protocol: protocolV2, thpState });

    console.log('[3/7] Load device + create seeded session ...');
    // The emulator is started with --temporary-profile so storage starts empty.
    // Skip WipeDevice: on a paired THP device, WipeDevice invalidates the
    // channel and the next call gets ThpUnallocatedChannel.
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
    console.log('      device loaded');

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

    console.log('[4/7] Add transition');
    const key = 'alice';
    const value_v1 = 'value-one';

    const ridResp = expectResponse(await tcall('KvGetRecordId', { key }), 'KvRecordId') as {
        record_id: string;
    };
    const recordId = fromHex(ridResp.record_id);
    console.log(`      record_id = ${hex(recordId)}`);

    const commitment_v1 = recordCommitment(recordId, key, value_v1);
    const leaf_v1 = leafHash(recordId, commitment_v1);
    const addRoot = rootForSingleLeaf(recordId, commitment_v1);

    const genesisHead = {
        schema_version: 1,
        seq: 0,
        records_root: hex(EMPTY_HASHES[0]),
        prev_head_hash: '',
        signature: '',
    };
    const addProof = {
        leaf_key: hex(recordId),
        sibling_hashes: [],
        sibling_bitmap: hex(EMPTY_BITMAP),
        exists: false,
    };
    console.log('      >>> approve "Add entry" on emulator window');
    const addResp = await awaitNonButton(
        await tcall('KvSignTransition', {
            operation: 'KvOperation_Add',
            key,
            old_head: genesisHead,
            new_value: value_v1,
            proof: addProof,
            proposed_new_root: hex(addRoot),
        }),
        tcall,
        onButton,
    );
    const addHead = (expectResponse(addResp, 'KvSignedTransition') as { new_head: KvHeadHex })
        .new_head;
    printHead('after Add', addHead);

    console.log('[5/7] Update transition');
    const value_v2 = 'value-two';
    const commitment_v2 = recordCommitment(recordId, key, value_v2);
    const leaf_v2 = leafHash(recordId, commitment_v2);
    const updateRoot = rootForSingleLeaf(recordId, commitment_v2);
    const updateProof = {
        leaf_key: hex(recordId),
        leaf_hash: hex(leaf_v1),
        sibling_hashes: [],
        sibling_bitmap: hex(EMPTY_BITMAP),
        exists: true,
    };
    console.log('      >>> approve "Update entry" on emulator window');
    const updResp = await awaitNonButton(
        await tcall('KvSignTransition', {
            operation: 'KvOperation_Update',
            key,
            old_head: addHead,
            old_value: value_v1,
            new_value: value_v2,
            proof: updateProof,
            proposed_new_root: hex(updateRoot),
        }),
        tcall,
        onButton,
    );
    const updHead = (expectResponse(updResp, 'KvSignedTransition') as { new_head: KvHeadHex })
        .new_head;
    printHead('after Update', updHead);

    console.log('[6/7] Delete transition');
    const deleteProof = {
        leaf_key: hex(recordId),
        leaf_hash: hex(leaf_v2),
        sibling_hashes: [],
        sibling_bitmap: hex(EMPTY_BITMAP),
        exists: true,
    };
    console.log('      >>> approve "Delete entry" on emulator window');
    const delResp = await awaitNonButton(
        await tcall('KvSignTransition', {
            operation: 'KvOperation_Delete',
            key,
            old_head: updHead,
            old_value: value_v2,
            proof: deleteProof,
            proposed_new_root: hex(EMPTY_HASHES[0]),
        }),
        tcall,
        onButton,
    );
    const delHead = (expectResponse(delResp, 'KvSignedTransition') as { new_head: KvHeadHex })
        .new_head;
    printHead('after Delete', delHead);

    console.log('[7/7] Verify chain');
    const auth = expectResponse(await tcall('KvGetAuthority', {}), 'KvAuthority') as {
        public_key: string;
        schema_version: number;
    };
    console.log(`      authority public_key = ${auth.public_key}`);

    const expectedGenesis = smtHeadHash(1, 0, EMPTY_HASHES[0], Buffer.alloc(0));
    console.log(`      genesis head_hash    = ${hex(expectedGenesis)}`);
    if (addHead.prev_head_hash !== hex(expectedGenesis)) {
        throw new Error(
            `prev_head_hash mismatch: got ${addHead.prev_head_hash}, expected ${hex(expectedGenesis)}`,
        );
    }
    if (delHead.records_root !== hex(EMPTY_HASHES[0])) {
        throw new Error(
            `delete should leave empty tree: got ${delHead.records_root}, expected ${hex(EMPTY_HASHES[0])}`,
        );
    }

    console.log('\nAll three transitions accepted and chained correctly.');

    await transport.release({ path: path as any, session });
    transport.stop();
};

main().catch(err => {
    console.error('FAILED:', err);
    process.exit(1);
});
