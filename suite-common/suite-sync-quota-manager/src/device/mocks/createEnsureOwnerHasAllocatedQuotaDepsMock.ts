import { createMockDeps } from '@suite-common/dependency-injection';
import { ok } from '@trezor/type-utils';

import { type CheckStorageByOwnerIdResult } from '../../owner/createCheckStorageByOwnerId';
import { type EnsureOwnerHasAllocatedQuotaDeps } from '../../owner/createEnsureOwnerHasAllocatedQuota';
import { createAllocateOwnerQuotaMock } from '../../owner/mocks/createAllocateOwnerQuotaMock';
import { createCheckStorageByOwnerIdMock } from '../../owner/mocks/createCheckStorageByOwnerIdMock';

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
