import { createMockDeps } from '@suite-common/dependency-injection';

import { createPrepareChallengeSessionMock } from '../challenge/mocks/createPrepareChallengeSessionMock';
import { type PrepareChallengeSessionResult } from '../challenge/prepareChallengeSession';
import { type EnsureOwnerHasAllocatedQuotaDeps } from '../createEnsureOwnerHasAllocatedQuota';
import { type CheckStorageByOwnerIdResult } from '../storage/createCheckStorageByOwnerId';
import { type TransferStorageResult } from '../storage/createTransferStorage';
import { createCheckStorageByOwnerIdMock } from '../storage/mocks/createCheckStorageByOwnerIdMock';
import { createTransferStorageMock } from '../storage/mocks/createTransferStorageMock';

type CreateEnsureOwnerHasAllocatedQuotaDepsMockParams = {
    checkStorageByOwnerIdResponses: CheckStorageByOwnerIdResult[];
    prepareChallengeSessionResponses: PrepareChallengeSessionResult[];
    transferStorageResponses: TransferStorageResult[];
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
