import { createMockDeps } from '@suite-common/dependency-injection';

import { createCheckStorageByPublicKeyMock } from './createCheckStorageByPublicKeyMock';
import { createPrepareChallengeSessionMock } from './createPrepareChallengeSessionMock';
import { createRegisterStorageMock } from './createRegisterStorageMock';
import { type EnsureDeviceHasQuotaDeps } from '../src/createEnsureDeviceHasQuota';

export const createEnsureDeviceHasQuotaDepsMock = (patch: Partial<EnsureDeviceHasQuotaDeps> = {}) =>
    createMockDeps<EnsureDeviceHasQuotaDeps>({
        checkStorageByPublicKey: createCheckStorageByPublicKeyMock(),
        dispatch: jest.fn(),
        getQuotaManagerBaseUrl: () => 'https://quota-manager.test',
        prepareChallengeSession: createPrepareChallengeSessionMock(),
        registerStorage: createRegisterStorageMock(),
        trezorConnect: {
            evoluSignRegistrationRequest: jest.fn(),
        },
        ...patch,
    });
