import { createMockDeps } from '@suite-common/dependency-injection';
import { ok } from '@trezor/type-utils';

import { createQuotaManagerFetchMock } from '../../mocks/createQuotaManagerFetchMock';
import { type RegisterStorageDeps } from '../createRegisterDeviceFetch';
import { createRegisterDeviceFetch } from '../createRegisterDeviceFetch';

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
        const deps = createMockDeps<RegisterStorageDeps>({
            quotaManagerFetch: createQuotaManagerFetchMock([
                ok({ totalStorageSize: 1000, unspentStorageSize: 800 }),
            ]),
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
