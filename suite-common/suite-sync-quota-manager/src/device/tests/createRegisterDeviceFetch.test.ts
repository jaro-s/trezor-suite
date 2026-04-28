import { ok } from '@trezor/type-utils';

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

    it('return the fetch result', async () => {
        const deps = createRegisterStorageDepsMock({
            quotaManagerFetchResponses: [ok({ totalStorageSize: 1000, unspentStorageSize: 800 })],
        });

        const result = await createRegisterDeviceFetch(deps)(params);

        expect(deps.quotaManagerFetch).toHaveBeenCalledWith({
            path: '/storage/register',
            method: 'POST',
            body: bodyParams,
        });

        expect(result).toEqual(
            ok({
                totalStorageSize: 1000,
                unspentStorageSize: 800,
            }),
        );
    });
});
