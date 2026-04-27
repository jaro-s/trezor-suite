import { createMockDeps } from '@suite-common/dependency-injection';

import { createPrepareChallengeSessionMock } from '../challenge/mocks/createPrepareChallengeSessionMock';
import { type PrepareChallengeSessionResult } from '../challenge/prepareChallengeSession';
import { type EnsureDeviceHasQuotaDeps } from '../createEnsureDeviceHasQuota';
import { type CheckStorageByPublicKeyResult } from '../storage/createCheckStorageByPublicKey';
import { type RegisterStorageResult } from '../storage/createRegisterStorage';
import { createCheckStorageByPublicKeyMock } from '../storage/mocks/createCheckStorageByPublicKeyMock';
import { createRegisterStorageMock } from '../storage/mocks/createRegisterStorageMock';

type CreateEnsureDeviceHasQuotaDepsMockParams = {
    checkStorageByPublicKeyResponses: CheckStorageByPublicKeyResult[];
    prepareChallengeSessionResponses: PrepareChallengeSessionResult[];
    registerStorageResponses: RegisterStorageResult[];
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
