import { createMockDeps } from '@suite-common/dependency-injection';

import { createPrepareChallengeSessionMock } from '../challenge/mocks/createPrepareChallengeSessionMock';
import { type EnsureOwnerHasAllocatedQuotaDeps } from '../createEnsureOwnerHasAllocatedQuota';
import { createCheckStorageByOwnerIdMock } from '../storage/mocks/createCheckStorageByOwnerIdMock';
import { createTransferStorageMock } from '../storage/mocks/createTransferStorageMock';

type CreateEnsureOwnerHasAllocatedQuotaDepsMockParams = {
    checkStorageByOwnerIdResponses: Parameters<typeof createCheckStorageByOwnerIdMock>[0];
    prepareChallengeSessionResponses: Parameters<typeof createPrepareChallengeSessionMock>[0];
    transferStorageResponses: Parameters<typeof createTransferStorageMock>[0];
    patch?: Partial<EnsureOwnerHasAllocatedQuotaDeps>;
};

export const createEnsureOwnerHasAllocatedQuotaDepsMock = ({
    checkStorageByOwnerIdResponses,
    prepareChallengeSessionResponses,
    transferStorageResponses,
    patch = {},
}: CreateEnsureOwnerHasAllocatedQuotaDepsMockParams) =>
    createMockDeps<EnsureOwnerHasAllocatedQuotaDeps>({
        checkStorageByOwnerId: createCheckStorageByOwnerIdMock(checkStorageByOwnerIdResponses),
        dispatch: jest.fn(),
        getLeftDeviceQuota: () => undefined,
        getQuotaManagerBaseUrl: () => 'https://quota-manager.test',
        prepareChallengeSession: createPrepareChallengeSessionMock(
            prepareChallengeSessionResponses,
        ),
        transferStorage: createTransferStorageMock(transferStorageResponses),
        ...patch,
    });
