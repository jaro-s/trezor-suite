import { createMockDeps } from '@suite-common/dependency-injection';
import { ok } from '@trezor/type-utils';

import { createAllocateOwnerQuotaMock } from '../owner/mocks/createAllocateOwnerQuotaMock';
import { type EnsureOwnerHasAllocatedQuotaDeps } from '../owner/createEnsureOwnerHasAllocatedQuota';
import { type CheckStorageByOwnerIdResult } from '../storage/createCheckStorageByOwnerId';
import { createCheckStorageByOwnerIdMock } from '../storage/mocks/createCheckStorageByOwnerIdMock';

type CreateEnsureOwnerHasAllocatedQuotaDepsMockParams = {
    checkStorageByOwnerIdResponses: CheckStorageByOwnerIdResult[];
    patch?: Partial<EnsureOwnerHasAllocatedQuotaDeps>;
};

export const createEnsureOwnerHasAllocatedQuotaDepsMock = ({
    checkStorageByOwnerIdResponses,
    patch = {},
}: CreateEnsureOwnerHasAllocatedQuotaDepsMockParams) =>
    createMockDeps<EnsureOwnerHasAllocatedQuotaDeps>({
        allocateOwnerQuota: createAllocateOwnerQuotaMock([ok()]),
        checkStorageByOwnerId: createCheckStorageByOwnerIdMock(checkStorageByOwnerIdResponses),
        dispatch: jest.fn(),
        ...patch,
    });
