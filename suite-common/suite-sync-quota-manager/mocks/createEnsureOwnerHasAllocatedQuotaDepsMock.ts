import { createMockDeps } from '@suite-common/dependency-injection';

import { createCheckStorageByOwnerIdMock } from './createCheckStorageByOwnerIdMock';
import { createPrepareChallengeSessionMock } from './createPrepareChallengeSessionMock';
import { createTransferStorageMock } from './createTransferStorageMock';
import { type EnsureOwnerHasAllocatedQuotaDeps } from '../src/createEnsureOwnerHasAllocatedQuota';

export const createEnsureOwnerHasAllocatedQuotaDepsMock = (
    patch: Partial<EnsureOwnerHasAllocatedQuotaDeps> = {},
) =>
    createMockDeps<EnsureOwnerHasAllocatedQuotaDeps>({
        checkStorageByOwnerId: createCheckStorageByOwnerIdMock(),
        dispatch: jest.fn(),
        getLeftDeviceQuota: () => undefined,
        getQuotaManagerBaseUrl: () => 'https://quota-manager.test',
        prepareChallengeSession: createPrepareChallengeSessionMock(),
        transferStorage: createTransferStorageMock(),
        ...patch,
    });
