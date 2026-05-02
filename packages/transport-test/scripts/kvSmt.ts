/**
 * KV sparse-Merkle-tree primitives for the manual KvSignTransition test.
 *
 * Mirrors `core/src/apps/common/kv_smt.py`, `kv_serialize.py`, and `kv.py`
 * from trezor-firmware (PR #12). Verified against firmware reference
 * vectors in `kvSmt.test.ts`.
 */
import { createHash } from 'crypto';

export const HASH_SIZE = 32;
export const TREE_DEPTH = HASH_SIZE * 8;

const EMPTY_DOMAIN = Buffer.from('kv-smt-empty-v1');
const LEAF_DOMAIN = Buffer.from('kv-smt-leaf-v1');
const NODE_DOMAIN = Buffer.from('kv-smt-node-v1');
const RECORD_DOMAIN = Buffer.from('kv-record-v1');
const HEAD_DOMAIN = Buffer.from('kv-head-v1');

const sha256 = (b: Buffer) => createHash('sha256').update(b).digest();

const buildEmptyHashes = (): Buffer[] => {
    const h: Buffer[] = new Array(TREE_DEPTH + 1);
    h[TREE_DEPTH] = sha256(Buffer.concat([EMPTY_DOMAIN, Buffer.from([0xff])]));
    for (let d = TREE_DEPTH - 1; d >= 0; d--) {
        h[d] = sha256(Buffer.concat([NODE_DOMAIN, h[d + 1], h[d + 1]]));
    }

    return h;
};

export const EMPTY_HASHES: readonly Buffer[] = buildEmptyHashes();

export const leafHash = (leafKey: Buffer, leafValueHash: Buffer): Buffer => {
    if (leafKey.length !== HASH_SIZE) throw new Error(`leafKey must be ${HASH_SIZE} bytes`);
    if (leafValueHash.length !== HASH_SIZE)
        throw new Error(`leafValueHash must be ${HASH_SIZE} bytes`);

    return sha256(Buffer.concat([LEAF_DOMAIN, leafKey, leafValueHash]));
};

export const nodeHash = (left: Buffer, right: Buffer): Buffer => {
    if (left.length !== HASH_SIZE) throw new Error(`left must be ${HASH_SIZE} bytes`);
    if (right.length !== HASH_SIZE) throw new Error(`right must be ${HASH_SIZE} bytes`);

    return sha256(Buffer.concat([NODE_DOMAIN, left, right]));
};

const writeCompactSize = (n: number): Buffer => {
    if (n < 0 || n > 0xffff_ffff) throw new Error('compact_size out of range');
    if (n < 253) return Buffer.from([n]);
    if (n < 0x1_0000) {
        const b = Buffer.alloc(3);
        b[0] = 253;
        b.writeUInt16LE(n, 1);

        return b;
    }
    const b = Buffer.alloc(5);
    b[0] = 254;
    b.writeUInt32LE(n, 1);

    return b;
};

export const serializeRecord = (key: string, value: string): Buffer => {
    const k = Buffer.from(key);
    const v = Buffer.from(value);

    return Buffer.concat([writeCompactSize(k.length), k, writeCompactSize(v.length), v]);
};

export const recordCommitment = (recordId: Buffer, key: string, value: string): Buffer => {
    if (recordId.length !== HASH_SIZE) throw new Error('recordId must be 32 bytes');

    return sha256(Buffer.concat([RECORD_DOMAIN, recordId, serializeRecord(key, value)]));
};

const u32be = (n: number) => {
    const b = Buffer.alloc(4);
    b.writeUInt32BE(n);

    return b;
};

const u64be = (n: number | bigint) => {
    const b = Buffer.alloc(8);
    b.writeBigUInt64BE(BigInt(n));

    return b;
};

export const headHash = (
    schemaVersion: number,
    seq: number | bigint,
    recordsRoot: Buffer,
    prevHeadHash: Buffer,
): Buffer => {
    if (schemaVersion <= 0) throw new Error('Invalid schema version');
    if (recordsRoot.length !== HASH_SIZE) throw new Error('recordsRoot must be 32 bytes');
    if (prevHeadHash.length !== 0 && prevHeadHash.length !== HASH_SIZE) {
        throw new Error('prevHeadHash must be 0 or 32 bytes');
    }

    return sha256(
        Buffer.concat([
            HEAD_DOMAIN,
            u32be(schemaVersion),
            u64be(seq),
            recordsRoot,
            writeCompactSize(prevHeadHash.length),
            prevHeadHash,
        ]),
    );
};

const keyBit = (leafKey: Buffer, level: number): number =>
    (leafKey[level >> 3] >> (7 - (level & 7))) & 1;

const bitmapBit = (bitmap: Buffer, index: number): number =>
    (bitmap[index >> 3] >> (7 - (index & 7))) & 1;

export type ProofInput = {
    leafKey: Buffer;
    exists: boolean;
    leafHash?: Buffer;
    siblingHashes: Buffer[];
    siblingBitmap?: Buffer;
};

export const computeRootFromProof = ({
    leafKey,
    exists,
    leafHash: proofLeafHash,
    siblingHashes,
    siblingBitmap,
}: ProofInput): Buffer => {
    if (leafKey.length !== HASH_SIZE) throw new Error('leafKey must be 32 bytes');

    const compact = !!siblingBitmap && siblingBitmap.length > 0;
    if (compact) {
        if (siblingBitmap!.length !== HASH_SIZE) throw new Error('siblingBitmap must be 32 bytes');
    } else if (siblingHashes.length !== TREE_DEPTH) {
        throw new Error(`siblingHashes must have length ${TREE_DEPTH}`);
    }

    let current: Buffer;
    if (exists) {
        if (!proofLeafHash) throw new Error('Inclusion proof requires leafHash');
        if (proofLeafHash.length !== HASH_SIZE) throw new Error('leafHash must be 32 bytes');
        current = proofLeafHash;
    } else {
        if (proofLeafHash !== undefined) throw new Error('Absence proof must not include leafHash');
        current = EMPTY_HASHES[TREE_DEPTH];
    }

    let siblingIndex = 0;
    for (let index = 0; index < TREE_DEPTH; index++) {
        let sibling: Buffer;
        if (compact) {
            if (bitmapBit(siblingBitmap!, index)) {
                if (siblingIndex >= siblingHashes.length) {
                    throw new Error('Missing compact sibling hash');
                }
                sibling = siblingHashes[siblingIndex++];
                if (sibling.length !== HASH_SIZE) throw new Error('sibling must be 32 bytes');
            } else {
                sibling = EMPTY_HASHES[TREE_DEPTH - index];
            }
        } else {
            sibling = siblingHashes[index];
            if (sibling.length !== HASH_SIZE) throw new Error('sibling must be 32 bytes');
        }
        const level = TREE_DEPTH - 1 - index;
        current =
            keyBit(leafKey, level) === 0 ? nodeHash(current, sibling) : nodeHash(sibling, current);
    }

    if (compact && siblingIndex !== siblingHashes.length) {
        throw new Error('Unexpected extra compact sibling hashes');
    }

    return current;
};

export const rootForSingleLeaf = (recordId: Buffer, valueHash: Buffer): Buffer =>
    computeRootFromProof({
        leafKey: recordId,
        exists: true,
        leafHash: leafHash(recordId, valueHash),
        siblingHashes: [],
        siblingBitmap: Buffer.alloc(HASH_SIZE),
    });

/**
 * Hash a single subtree of the (otherwise empty) sparse Merkle tree given the
 * leaves that fall under it. `depth` is the depth of the subtree's root
 * (0 = whole tree, TREE_DEPTH = leaf level). The leaves passed in must all
 * share the same first `depth` key bits — the caller is responsible for that
 * partitioning.
 */
const subtreeRoot = (leaves: Array<{ rid: Buffer; vh: Buffer }>, depth: number): Buffer => {
    if (leaves.length === 0) return EMPTY_HASHES[depth];
    if (depth === TREE_DEPTH) {
        if (leaves.length !== 1) {
            throw new Error('multiple leaves with the same record_id');
        }

        return leafHash(leaves[0].rid, leaves[0].vh);
    }
    const left: typeof leaves = [];
    const right: typeof leaves = [];
    for (const l of leaves) {
        (keyBit(l.rid, depth) === 0 ? left : right).push(l);
    }

    return nodeHash(subtreeRoot(left, depth + 1), subtreeRoot(right, depth + 1));
};

export type KvSparseTreeProof = {
    exists: boolean;
    leafHash?: Buffer;
    siblingHashes: Buffer[];
    siblingBitmap: Buffer;
};

/**
 * Tiny in-memory sparse Merkle tree compatible with the firmware's
 * `KvSparseMerkleProof` (compact form: only non-default sibling hashes are
 * sent, with a 32-byte bitmap marking their positions).
 *
 * Designed for small N (a handful of leaves in a manual test). Root and proof
 * computations are O(TREE_DEPTH * N), which is fine here.
 */
export class KvSparseTree {
    private leaves: Array<{ rid: Buffer; vh: Buffer }> = [];

    insert(recordId: Buffer, valueHash: Buffer): void {
        if (recordId.length !== HASH_SIZE) throw new Error('recordId must be 32 bytes');
        if (valueHash.length !== HASH_SIZE) throw new Error('valueHash must be 32 bytes');
        const idx = this.leaves.findIndex(l => l.rid.equals(recordId));
        if (idx >= 0) this.leaves[idx] = { rid: recordId, vh: valueHash };
        else this.leaves.push({ rid: recordId, vh: valueHash });
    }

    delete(recordId: Buffer): void {
        this.leaves = this.leaves.filter(l => !l.rid.equals(recordId));
    }

    root(): Buffer {
        return subtreeRoot(this.leaves, 0);
    }

    proof(recordId: Buffer): KvSparseTreeProof {
        if (recordId.length !== HASH_SIZE) throw new Error('recordId must be 32 bytes');
        const present = this.leaves.find(l => l.rid.equals(recordId));

        // Siblings are accumulated as we descend from root (d = 0) down to the
        // leaf (d = TREE_DEPTH). `computeRootFromProof` walks the OTHER way —
        // from leaf back up to root — and at its iteration step `index = i`
        // it combines with the sibling at depth `TREE_DEPTH - i`. So the
        // sibling we discover at d corresponds to the verifier's
        // `index = TREE_DEPTH - 1 - d`. Build the bitmap at that index, and
        // emit the siblings array ordered by ascending verifier index
        // (= descending d), which is what the verifier consumes.
        const siblingsByDescendingD: Buffer[] = [];
        const siblingBitmap = Buffer.alloc(HASH_SIZE);

        let onPath = this.leaves.slice();
        for (let d = 0; d < TREE_DEPTH; d++) {
            const targetBit = keyBit(recordId, d);
            const onTargetSide: typeof onPath = [];
            const onSiblingSide: typeof onPath = [];
            for (const l of onPath) {
                (keyBit(l.rid, d) === targetBit ? onTargetSide : onSiblingSide).push(l);
            }
            const sibHash = subtreeRoot(onSiblingSide, d + 1);
            if (!sibHash.equals(EMPTY_HASHES[d + 1])) {
                const verifierIdx = TREE_DEPTH - 1 - d;
                siblingsByDescendingD.push(sibHash);
                siblingBitmap[verifierIdx >> 3] |= 1 << (7 - (verifierIdx & 7));
            }
            onPath = onTargetSide;
        }
        // Reverse so the deepest-d sibling (smallest verifier index) is first.
        const siblingHashes = siblingsByDescendingD.reverse();

        return {
            exists: !!present,
            leafHash: present ? leafHash(recordId, present.vh) : undefined,
            siblingHashes,
            siblingBitmap,
        };
    }
}
