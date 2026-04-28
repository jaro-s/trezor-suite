import { err, ok } from '@trezor/type-utils';

import { quotaManagerDeviceFetched } from '../../quotaManagerActions';
import { createRegisterDeviceFetch } from '../createRegisterDeviceFetch';
import { createRegisterStorageDepsMock } from '../mocks/createRegisterStorageDepsMock';

describe(createRegisterDeviceFetch.name, () => {
    const bodyParams = {
        publicKey: 'pubkey',
        size: 123,
        proof: 'proof',
        certificateChain: {
            deviceCert: 'deviceCert',
            caCert: 'caCert',
        },
        deviceModel: 'T3T1',
        sessionId: 'sessionId',
        challenge: 'challenge',
    };
    const params = { deviceId: 'device-id', ...bodyParams };

    it('dispatches quotaManagerDeviceFetched on success', async () => {
        const deps = createRegisterStorageDepsMock({
            quotaManagerFetchResponses: [
                ok({
                    totalStorageSize: 1000,
                    unspentStorageSize: 800,
                }),
            ],
        });

        const result = await createRegisterDeviceFetch(deps)(params);

        expect(deps.quotaManagerFetch).toHaveBeenCalledWith({
            path: '/storage/register',
            method: 'POST',
            body: bodyParams,
        });
        expect(deps.dispatch).toHaveBeenCalledWith(
            quotaManagerDeviceFetched({
                deviceId: 'device-id',
                totalStorageSize: 1000,
                unspentStorageSize: 800,
            }),
        );
        expect(result).toEqual(
            ok({
                totalStorageSize: 1000,
                unspentStorageSize: 800,
            }),
        );
    });

    it('returns fetch errors without dispatching any failure action', async () => {
        const deps = createRegisterStorageDepsMock({
            quotaManagerFetchResponses: [err({ type: 'FetchError', message: 'Network error' })],
        });

        const result = await createRegisterDeviceFetch(deps)(params);

        expect(deps.dispatch).not.toHaveBeenCalled();
        expect(result).toEqual(err({ type: 'FetchError', message: 'Network error' }));
    });
});
