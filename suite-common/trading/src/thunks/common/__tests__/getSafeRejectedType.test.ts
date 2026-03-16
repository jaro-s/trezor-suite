import { getSafeRejectedType } from '../getSafeRejectedType';

describe('getSafeRejectedType', () => {
    it.each([
        null,
        undefined,
        123,
        'error',
        {},
        { message: 'error' },
        { type: 'Rejected' },
        { type: 'unknown-error' },
        { type: '' },
    ])("should return 'sign-tx-error' for %s", payload => {
        expect(getSafeRejectedType(payload)).toBe('sign-tx-error');
    });

    it.each([['error'], ['sign-tx-error'], ['sign-transaction-timeout']])(
        'should pass through valid type %s',
        type => {
            expect(getSafeRejectedType({ type })).toBe(type);
        },
    );
});
