import { DELEGATED_IDENTITY_KEY } from '@suite-common/delegated-identity-key-types/mocks';
import { type TrezorDeviceWithState } from '@suite-common/suite-types';
import { mockSuiteDevice } from '@suite-common/suite-types/mocks';
import { DeviceModelInternal } from '@trezor/device-utils';
import { err, ok } from '@trezor/type-utils';

import { createCheckStorageByPublicKeyMock } from '../../mocks/createCheckStorageByPublicKeyMock';
import { createEnsureDeviceHasQuotaDepsMock } from '../../mocks/createEnsureDeviceHasQuotaDepsMock';
import { createPrepareChallengeSessionMock } from '../../mocks/createPrepareChallengeSessionMock';
import { DEFAULT_DEVICE_SIZE_QUOTA } from '../constants';
import { createEnsureDeviceHasQuota } from '../createEnsureDeviceHasQuota';

const device = mockSuiteDevice(
    { id: 'device-id' },
    { internal_model: DeviceModelInternal.T2T1 },
) as TrezorDeviceWithState;

describe(createEnsureDeviceHasQuota.name, () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('dispatches device fetched when storage already exists', async () => {
        const deps = createEnsureDeviceHasQuotaDepsMock({
            checkStorageByPublicKey: createCheckStorageByPublicKeyMock([
                ok({ status: 'Allocated', totalSpace: 5000, unspentSpace: 1200 }),
            ]),
        });

        const result = await createEnsureDeviceHasQuota(deps)({
            delegatedKey: DELEGATED_IDENTITY_KEY,
            device,
        });

        expect(result).toEqual(ok());
        expect(deps.checkStorageByPublicKey).toHaveBeenCalledWith({
            baseUrl: 'https://quota-manager.test',
            publicKey:
                '0428a3cefc19b41ff56795e371aab72d6d85a3ca2200bd46c54e611a36222295a88b44d6f23ce94025b6010f9eb0f9168ad35d8396dc865fa0a16f2f5471816a45',
        });
        expect(deps.dispatch).toHaveBeenCalledWith(
            expect.objectContaining({
                type: '@suite/quota-manager/deviceFetched',
                payload: {
                    deviceId: 'device-id',
                    totalStorageSize: 5000,
                    unspentStorageSize: 1200,
                },
            }),
        );
        expect(deps.prepareChallengeSession).not.toHaveBeenCalled();
        expect(deps.registerStorage).not.toHaveBeenCalled();
    });

    it('returns QuotaManagerCommunicationFailed for non-404 failures', async () => {
        const deps = createEnsureDeviceHasQuotaDepsMock({
            checkStorageByPublicKey: createCheckStorageByPublicKeyMock([
                err({ type: 'HttpError', code: 500, message: 'Internal error' }),
            ]),
        });

        const result = await createEnsureDeviceHasQuota(deps)({
            delegatedKey: DELEGATED_IDENTITY_KEY,
            device,
        });

        expect(result).toEqual(
            err({
                type: 'QuotaManagerCommunicationFailed',
                caused: { type: 'HttpError', code: 500, message: 'Internal error' },
            }),
        );
        expect(deps.prepareChallengeSession).not.toHaveBeenCalled();
    });

    it('returns QuotaManagerNoQuota when server reports NoQuota status', async () => {
        const deps = createEnsureDeviceHasQuotaDepsMock({
            checkStorageByPublicKey: createCheckStorageByPublicKeyMock([ok({ status: 'NoQuota' })]),
        });

        const result = await createEnsureDeviceHasQuota(deps)({
            delegatedKey: DELEGATED_IDENTITY_KEY,
            device,
        });

        expect(result).toEqual(err({ type: 'QuotaManagerNoQuota' }));
        expect(deps.prepareChallengeSession).not.toHaveBeenCalled();
        expect(deps.registerStorage).not.toHaveBeenCalled();
    });

    it('requests registration when device is unknown (HTTP 404)', async () => {
        const evoluSignRegistrationRequest = jest.fn().mockResolvedValue({
            success: true,
            payload: {
                certificate_chain: ['device-cert', 'ca-cert'],
                signature: 'device-signature',
            },
        });

        const deps = createEnsureDeviceHasQuotaDepsMock({
            checkStorageByPublicKey: createCheckStorageByPublicKeyMock([
                err({ type: 'HttpError', code: 404, message: 'Not found' }),
            ]),
            prepareChallengeSession: createPrepareChallengeSessionMock([
                ok({ sessionId: 'session-123', challenge: 'aa55' }),
            ]),
            trezorConnect: {
                evoluSignRegistrationRequest,
            },
        });

        const result = await createEnsureDeviceHasQuota(deps)({
            delegatedKey: DELEGATED_IDENTITY_KEY,
            device,
        });

        expect(result).toEqual(ok());
        expect(deps.prepareChallengeSession).toHaveBeenCalledWith({
            baseUrl: 'https://quota-manager.test',
        });
        expect(evoluSignRegistrationRequest).toHaveBeenCalledWith({
            challenge_from_server: 'aa55',
            size_to_acquire: DEFAULT_DEVICE_SIZE_QUOTA,
            proof_of_delegated_identity:
                '9d40167d8ec7ce7949f1675d60a4d5c2a6ec5f16152bdc6c7959af99c856d31570c0d262996917cf424a3e638a7ee10b57aa2864c06895b0728d09f040496177',
        });
        expect(deps.registerStorage).toHaveBeenCalledWith({
            deviceId: 'device-id',
            size: DEFAULT_DEVICE_SIZE_QUOTA,
            certificateChain: {
                deviceCert: 'device-cert',
                caCert: 'ca-cert',
            },
            challenge: 'aa55',
            proof: 'device-signature',
            sessionId: 'session-123',
            deviceModel: 'T2T1',
            publicKey:
                '0428a3cefc19b41ff56795e371aab72d6d85a3ca2200bd46c54e611a36222295a88b44d6f23ce94025b6010f9eb0f9168ad35d8396dc865fa0a16f2f5471816a45',
        });
    });
});
