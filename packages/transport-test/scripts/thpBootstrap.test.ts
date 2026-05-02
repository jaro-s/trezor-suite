import { awaitNonButton, expectResponse } from './thpBootstrap';

const ok = (payload: unknown) => ({ success: true as const, payload });
const err = (code: string) => ({
    success: false as const,
    error: { code, message: code },
});

describe('thpBootstrap helpers', () => {
    describe('expectResponse', () => {
        it('returns the inner message when type matches', () => {
            const r = ok({ type: 'ThpEndResponse', message: { hello: 'world' } });
            const m = expectResponse(r as any, 'ThpEndResponse');
            expect(m).toEqual({ hello: 'world' });
        });

        it('accepts an array of acceptable types', () => {
            const r = ok({ type: 'ThpPairingRequestApproved', message: { x: 1 } });
            const m = expectResponse(r as any, ['ThpEndResponse', 'ThpPairingRequestApproved']);
            expect(m).toEqual({ x: 1 });
        });

        it('throws on transport failure', () => {
            const r = err('device disconnected during action');
            expect(() => expectResponse(r as any, 'Anything')).toThrow(/disconnected/);
        });

        it('throws on Failure response with code/message', () => {
            const r = ok({
                type: 'Failure',
                message: { code: 'Failure_DataError', message: 'bad' },
            });
            expect(() => expectResponse(r as any, 'ThpEndResponse')).toThrow(
                /Failure_DataError.*bad/,
            );
        });

        it('throws on ThpError response', () => {
            const r = ok({
                type: 'ThpError',
                message: { code: 'TRANSPORT_BUSY', message: 'busy' },
            });
            expect(() => expectResponse(r as any, 'ThpEndResponse')).toThrow(/TRANSPORT_BUSY/);
        });

        it('throws on unexpected message type', () => {
            const r = ok({ type: 'Whatever', message: {} });
            expect(() =>
                expectResponse(r as any, ['ThpEndResponse', 'ThpPairingRequestApproved']),
            ).toThrow(/Whatever/);
        });
    });

    describe('awaitNonButton', () => {
        it('returns the response immediately when not a ButtonRequest', async () => {
            const calls: string[] = [];
            const callOnce = jest.fn().mockResolvedValue(ok({ type: 'Success', message: {} }));
            const onButton = jest.fn(() => {
                calls.push('onButton');
            });
            const initial = ok({ type: 'Success', message: {} });
            const out = await awaitNonButton(initial as any, callOnce as any, onButton);
            expect(out).toBe(initial);
            expect(callOnce).not.toHaveBeenCalled();
            expect(onButton).not.toHaveBeenCalled();
        });

        it('sends ButtonAck and recurses while ButtonRequest is returned', async () => {
            let callIdx = 0;
            const responses = [
                ok({ type: 'ButtonRequest', message: { code: 'ProtectCall' } }),
                ok({ type: 'Success', message: { ok: true } }),
            ];
            const callOnce = jest.fn((name: string, _data: any) => {
                expect(name).toBe('ButtonAck');

                return Promise.resolve(responses[callIdx++]);
            });
            const onButton = jest.fn();
            const initial = ok({ type: 'ButtonRequest', message: { code: 'ConfirmOutput' } });

            const out = await awaitNonButton(initial as any, callOnce as any, onButton);
            expect((out.payload as any).type).toBe('Success');
            expect(callOnce).toHaveBeenCalledTimes(2);
            expect(onButton).toHaveBeenCalledTimes(2);
            expect(onButton).toHaveBeenNthCalledWith(1, { code: 'ConfirmOutput' });
            expect(onButton).toHaveBeenNthCalledWith(2, { code: 'ProtectCall' });
        });

        it('propagates a transport failure during the loop', async () => {
            const callOnce = jest.fn().mockResolvedValue(err('device disconnected during action'));
            const initial = ok({ type: 'ButtonRequest', message: {} });
            const out = await awaitNonButton(initial as any, callOnce as any);
            expect(out.success).toBe(false);
        });
    });
});
