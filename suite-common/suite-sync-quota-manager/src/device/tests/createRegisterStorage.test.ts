import { createMockDeps } from '@suite-common/dependency-injection';
import { err, ok } from '@trezor/type-utils';

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

    it('returns data on success', async () => {
        const deps = createMockDeps<RegisterStorageDeps>({
            quotaManagerFetch: createQuotaManagerFetchMock([
                ok({
                    totalStorageSize: 1000,
                    unspentStorageSize: 800,
                }),
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

    it('returns fetch errors', async () => {
        const deps = createMockDeps<RegisterStorageDeps>({
            quotaManagerFetch: createQuotaManagerFetchMock([
                err({ type: 'FetchError', message: 'Network error' }),
            ]),
        });

        const result = await createRegisterDeviceFetch(deps)(params);

        expect(result).toEqual(err({ type: 'FetchError', message: 'Network error' }));
    });
});
