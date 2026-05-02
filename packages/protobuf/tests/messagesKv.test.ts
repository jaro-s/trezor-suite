import { AnyDesc } from '@bufbuild/protobuf';

import { ProtobufManager } from '../src/manager';

const protoFiles = ['messages-common', 'messages', 'messages-crypto', 'options'];

const protobufManager = ProtobufManager();
protobufManager.load(
    protoFiles.map(name => require(`../src/definitions/${name}_pb`) as Record<string, AnyDesc>),
);

describe('KV messages (PR #12)', () => {
    describe('MessageType IDs', () => {
        const cases: [string, number][] = [
            ['KvGetAuthority', 2110],
            ['KvAuthority', 2111],
            ['KvGetRecordId', 2112],
            ['KvRecordId', 2113],
            ['KvSignTransition', 2114],
            ['KvSignedTransition', 2115],
        ];

        it.each(cases)('%s resolves to MessageType=%i', (name, expected) => {
            const { messageType } = protobufManager.findSchema(name);
            expect(messageType).toBe(expected);
        });
    });

    describe('KvOperationType enum', () => {
        it('exposes Add=1, Update=2, Delete=3', () => {
            const schema = protobufManager.findEnum('KvOperationType');
            expect(schema).toBeDefined();
            const values = schema!.values.map(v => [v.name, v.number]);
            expect(values).toEqual(
                expect.arrayContaining([
                    ['KvOperation_Add', 1],
                    ['KvOperation_Update', 2],
                    ['KvOperation_Delete', 3],
                ]),
            );
        });
    });

    describe('encode/decode round-trip', () => {
        it('round-trips KvSignTransition (Add)', () => {
            const data = {
                operation: 'KvOperation_Add',
                key: 'alice',
                old_head: {
                    schema_version: 1,
                    seq: 0,
                    records_root: 'aa'.repeat(32),
                    prev_head_hash: '',
                    signature: '',
                },
                new_value: 'value-one',
                proof: {
                    leaf_key: 'bb'.repeat(32),
                    sibling_hashes: [],
                    sibling_bitmap: '00'.repeat(32),
                    exists: false,
                },
                proposed_new_root: 'cc'.repeat(32),
            };
            const encoded = protobufManager.encode('KvSignTransition', data);
            expect(encoded.messageType).toBe(2114);
            expect(encoded.message.length).toBeGreaterThan(0);

            const decoded = protobufManager.decode(2114, encoded.message);
            expect(decoded.type).toBe('KvSignTransition');
            const m = decoded.message as Record<string, any>;
            expect(m.operation).toBe('KvOperation_Add');
            expect(m.key).toBe('alice');
            expect(m.new_value).toBe('value-one');
            expect(m.proposed_new_root).toBe('cc'.repeat(32));
            expect(m.proof.leaf_key).toBe('bb'.repeat(32));
            expect(m.proof.exists).toBe(false);
            expect(m.old_head.records_root).toBe('aa'.repeat(32));
            expect(m.old_head.seq).toBe(0);
            expect(m.old_head.schema_version).toBe(1);
        });

        it('round-trips KvSignedTransition with signed head', () => {
            const data = {
                new_head: {
                    schema_version: 1,
                    seq: 1,
                    records_root: '11'.repeat(32),
                    prev_head_hash: '22'.repeat(32),
                    signature: '33'.repeat(64),
                },
            };
            const encoded = protobufManager.encode('KvSignedTransition', data);
            const decoded = protobufManager.decode(2115, encoded.message);
            expect(decoded.type).toBe('KvSignedTransition');
            const m = decoded.message as Record<string, any>;
            expect(m.new_head.seq).toBe(1);
            expect(m.new_head.signature).toBe('33'.repeat(64));
            expect(m.new_head.prev_head_hash).toBe('22'.repeat(32));
        });

        it('round-trips KvRecordId with bytes-as-hex', () => {
            const recordIdHex = '01'.repeat(32);
            const encoded = protobufManager.encode('KvRecordId', { record_id: recordIdHex });
            const decoded = protobufManager.decode(2113, encoded.message);
            expect((decoded.message as any).record_id).toBe(recordIdHex);
        });
    });
});
