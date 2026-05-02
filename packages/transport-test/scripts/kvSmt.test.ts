import { createHash } from 'crypto';

import {
    EMPTY_HASHES,
    HASH_SIZE,
    TREE_DEPTH,
    computeRootFromProof,
    headHash,
    leafHash,
    nodeHash,
    recordCommitment,
    rootForSingleLeaf,
    serializeRecord,
} from './kvSmt';

const sha256 = (b: Buffer) => createHash('sha256').update(b).digest();

const hex = (b: Buffer) => b.toString('hex');

describe('kvSmt — SMT primitives', () => {
    it('TREE_DEPTH is 256, HASH_SIZE is 32', () => {
        expect(TREE_DEPTH).toBe(256);
        expect(HASH_SIZE).toBe(32);
    });

    describe('EMPTY_HASHES', () => {
        it('has TREE_DEPTH+1 entries', () => {
            expect(EMPTY_HASHES).toHaveLength(TREE_DEPTH + 1);
        });

        it('EMPTY_HASHES[256] = sha256("kv-smt-empty-v1" || 0xff)', () => {
            const expected = sha256(
                Buffer.concat([Buffer.from('kv-smt-empty-v1'), Buffer.from([0xff])]),
            );
            expect(hex(EMPTY_HASHES[TREE_DEPTH])).toBe(hex(expected));
            expect(hex(EMPTY_HASHES[TREE_DEPTH])).toBe(
                '84d7512edde463b6d3e52ff2660995260be1ebaa5eab17cf0b99623e93a1002d',
            );
        });

        it('EMPTY_HASHES[d] = node_hash(EMPTY_HASHES[d+1], EMPTY_HASHES[d+1])', () => {
            for (const d of [0, 1, 100, 200, 255]) {
                const expected = nodeHash(EMPTY_HASHES[d + 1], EMPTY_HASHES[d + 1]);
                expect(hex(EMPTY_HASHES[d])).toBe(hex(expected));
            }
        });

        it('matches firmware reference vectors at depth 0, 255, 256', () => {
            expect(hex(EMPTY_HASHES[0])).toBe(
                '7b34914e92166af7b5cc746084ebae6c617a1d43714985281642e8be16e58ff9',
            );
            expect(hex(EMPTY_HASHES[255])).toBe(
                '290ca551276c49cd30e9a312adf473906abf96400f1b42abff08b9f6dab53c3f',
            );
            expect(hex(EMPTY_HASHES[256])).toBe(
                '84d7512edde463b6d3e52ff2660995260be1ebaa5eab17cf0b99623e93a1002d',
            );
        });
    });

    describe('leafHash / nodeHash', () => {
        it('leafHash matches reference vector for rid=0..0, vh=aa..aa', () => {
            const rid = Buffer.alloc(32);
            const vh = Buffer.alloc(32, 0xaa);
            expect(hex(leafHash(rid, vh))).toBe(
                'b8b2d5e4ab2e89697410728f84735232ef19bf77a735d53ee807da92f032ec36',
            );
        });

        it('leafHash domain separates from nodeHash', () => {
            const a = Buffer.alloc(32, 0x11);
            const b = Buffer.alloc(32, 0x22);
            expect(hex(leafHash(a, b))).not.toBe(hex(nodeHash(a, b)));
        });

        it('nodeHash is not commutative', () => {
            const a = Buffer.alloc(32, 0x11);
            const b = Buffer.alloc(32, 0x22);
            expect(hex(nodeHash(a, b))).not.toBe(hex(nodeHash(b, a)));
        });
    });

    describe('serializeRecord', () => {
        it('uses compact_size length prefix (1 byte for short keys/values)', () => {
            const buf = serializeRecord('alice', 'value-one');
            // compact_size(5) || 'alice' || compact_size(9) || 'value-one'
            expect(buf[0]).toBe(5);
            expect(buf.slice(1, 6).toString()).toBe('alice');
            expect(buf[6]).toBe(9);
            expect(buf.slice(7).toString()).toBe('value-one');
        });

        it('uses 0xfd + 2-byte LE for keys 253..65535 bytes', () => {
            const longKey = 'k'.repeat(300);
            const buf = serializeRecord(longKey, 'v');
            expect(buf[0]).toBe(0xfd);
            expect(buf.readUInt16LE(1)).toBe(300);
            expect(buf.slice(3, 303).toString()).toBe(longKey);
            // value=1 byte
            expect(buf[303]).toBe(1);
            expect(buf[304]).toBe('v'.charCodeAt(0));
        });
    });

    describe('recordCommitment', () => {
        it('matches firmware vector for rid=0..0, key=alice, value=value-one', () => {
            const rid = Buffer.alloc(32);
            expect(hex(recordCommitment(rid, 'alice', 'value-one'))).toBe(
                'cedfdd214d777f0b8d1e5d2b6d62fc90692536607ca0be4085a0826a0a1ff7d0',
            );
        });
    });

    describe('headHash', () => {
        it('genesis head over empty tree matches firmware vector', () => {
            const h = headHash(1, 0, EMPTY_HASHES[0], Buffer.alloc(0));
            expect(hex(h)).toBe('f13718f9055c42752f850c44424275c5ae217d9b7443c225594bf7eb34dcd59f');
        });

        it('uses compact_size for prev_head_hash length (1 byte for 0 or 32 byte hashes)', () => {
            // prev_head_hash empty (length 0) and 32-byte both fit in single compact_size byte
            const empty = headHash(1, 0, EMPTY_HASHES[0], Buffer.alloc(0));
            const withPrev = headHash(1, 1, EMPTY_HASHES[0], Buffer.alloc(32, 0x11));
            expect(empty.length).toBe(32);
            expect(withPrev.length).toBe(32);
            expect(hex(empty)).not.toBe(hex(withPrev));
        });
    });

    describe('rootForSingleLeaf', () => {
        it('matches firmware vector for rid=sha256("alice"), value="value-one"', () => {
            const rid = sha256(Buffer.from('alice'));
            const vh = recordCommitment(rid, 'alice', 'value-one');
            expect(hex(rid)).toBe(
                '2bd806c97f0e00af1a1fc3328fa763a9269723c8db8fac4f93af71db186d6e90',
            );
            expect(hex(vh)).toBe(
                '843dce9fd3be23a55bf05d47ba212cffb6c2a13ca592219b205ce87c36d1e087',
            );
            expect(hex(rootForSingleLeaf(rid, vh))).toBe(
                '912aabedc64cd0972a7fbffda3d3f37a7a32700dd1f24ea778d86279991ddc37',
            );
        });
    });

    describe('computeRootFromProof', () => {
        const emptyBitmap = Buffer.alloc(32, 0);

        it('absence proof against empty tree yields EMPTY_HASHES[0]', () => {
            const rid = sha256(Buffer.from('alice'));
            const root = computeRootFromProof({
                leafKey: rid,
                exists: false,
                siblingHashes: [],
                siblingBitmap: emptyBitmap,
            });
            expect(hex(root)).toBe(hex(EMPTY_HASHES[0]));
        });

        it('inclusion proof against single-leaf tree matches rootForSingleLeaf', () => {
            const rid = sha256(Buffer.from('alice'));
            const vh = recordCommitment(rid, 'alice', 'value-one');
            const lh = leafHash(rid, vh);
            const root = computeRootFromProof({
                leafKey: rid,
                exists: true,
                leafHash: lh,
                siblingHashes: [],
                siblingBitmap: emptyBitmap,
            });
            expect(hex(root)).toBe(hex(rootForSingleLeaf(rid, vh)));
        });

        it('inclusion proof requires a leafHash', () => {
            expect(() =>
                computeRootFromProof({
                    leafKey: Buffer.alloc(32),
                    exists: true,
                    siblingHashes: [],
                    siblingBitmap: emptyBitmap,
                }),
            ).toThrow();
        });

        it('absence proof must not include a leafHash', () => {
            expect(() =>
                computeRootFromProof({
                    leafKey: Buffer.alloc(32),
                    exists: false,
                    leafHash: Buffer.alloc(32),
                    siblingHashes: [],
                    siblingBitmap: emptyBitmap,
                }),
            ).toThrow();
        });
    });
});
