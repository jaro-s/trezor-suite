import { createMockDeps } from '@suite-common/dependency-injection';

import { createPrepareChallengeSessionMock } from '../challenge/mocks/createPrepareChallengeSessionMock';
import { type EnsureDeviceHasQuotaDeps } from '../createEnsureDeviceHasQuota';
import { createCheckStorageByPublicKeyMock } from '../storage/mocks/createCheckStorageByPublicKeyMock';
import { createRegisterStorageMock } from '../storage/mocks/createRegisterStorageMock';

type CreateEnsureDeviceHasQuotaDepsMockParams = {
    checkStorageByPublicKeyResponses: Parameters<typeof createCheckStorageByPublicKeyMock>[0];
    prepareChallengeSessionResponses: Parameters<typeof createPrepareChallengeSessionMock>[0];
    registerStorageResponses: Parameters<typeof createRegisterStorageMock>[0];
    patch?: Partial<EnsureDeviceHasQuotaDeps>;
};

export const createEnsureDeviceHasQuotaDepsMock = ({
    checkStorageByPublicKeyResponses,
    prepareChallengeSessionResponses,
    registerStorageResponses,
    patch = {},
}: CreateEnsureDeviceHasQuotaDepsMockParams) =>
    createMockDeps<EnsureDeviceHasQuotaDeps>({
        checkStorageByPublicKey: createCheckStorageByPublicKeyMock(
            checkStorageByPublicKeyResponses,
        ),
        dispatch: jest.fn(),
        getQuotaManagerBaseUrl: () => 'https://quota-manager.test',
        prepareChallengeSession: createPrepareChallengeSessionMock(
            prepareChallengeSessionResponses,
        ),
        registerStorage: createRegisterStorageMock(registerStorageResponses),
        trezorConnect: {
            evoluSignRegistrationRequest: jest.fn(),
        },
        ...patch,
    });
