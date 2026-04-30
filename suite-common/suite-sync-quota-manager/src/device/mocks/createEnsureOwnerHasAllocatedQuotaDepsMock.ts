import { createMockDeps } from '@suite-common/dependency-injection';
import { ok } from '@trezor/type-utils';

import { type CheckStorageByOwnerIdResult } from '../../owner/createCheckStorageByOwnerId';
import { type EnsureOwnerHasAllocatedQuotaDeps } from '../../owner/createEnsureOwnerHasAllocatedQuota';
import { createCheckStorageByOwnerIdMock } from '../../owner/mocks/createCheckStorageByOwnerIdMock';
import { createIncreaseOwnerQuotaMock } from '../../owner/mocks/createIncreaseOwnerQuotaMock';

type CreateEnsureOwnerHasAllocatedQuotaDepsMockParams = {
    checkStorageByOwnerIdResponses: CheckStorageByOwnerIdResult[];
    patch?: Partial<EnsureOwnerHasAllocatedQuotaDeps>;
};

export const createEnsureOwnerHasAllocatedQuotaDepsMock = ({
    checkStorageByOwnerIdResponses,
    patch = {},
}: CreateEnsureOwnerHasAllocatedQuotaDepsMockParams) =>
    createMockDeps<EnsureOwnerHasAllocatedQuotaDeps>({
        checkStorageByOwnerId: createCheckStorageByOwnerIdMock(checkStorageByOwnerIdResponses),
        dispatch: jest.fn(),
        increaseOwnerQuota: createIncreaseOwnerQuotaMock([ok()]),
        ...patch,
    });
