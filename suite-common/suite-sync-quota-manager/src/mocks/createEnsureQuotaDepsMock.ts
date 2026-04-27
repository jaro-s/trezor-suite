import { createMockDeps } from '@suite-common/dependency-injection';

import { createEnsureDeviceHasQuotaMock } from './createEnsureDeviceHasQuotaMock';
import { createEnsureOwnerHasAllocatedQuotaMock } from './createEnsureOwnerHasAllocatedQuotaMock';
import { type EnsureQuotaDeps } from '../createEnsureQuota';

type CreateEnsureQuotaDepsMockParams = {
    ensureDeviceHasQuotaResponses: Parameters<typeof createEnsureDeviceHasQuotaMock>[0];
    ensureOwnerHasAllocatedQuotaResponses: Parameters<
        typeof createEnsureOwnerHasAllocatedQuotaMock
    >[0];
    patch?: Partial<EnsureQuotaDeps>;
};

export const createEnsureQuotaDepsMock = ({
    ensureDeviceHasQuotaResponses,
    ensureOwnerHasAllocatedQuotaResponses,
    patch = {},
}: CreateEnsureQuotaDepsMockParams) =>
    createMockDeps<EnsureQuotaDeps>({
        ensureDeviceHasQuota: createEnsureDeviceHasQuotaMock(ensureDeviceHasQuotaResponses),
        ensureOwnerHasAllocatedQuota: createEnsureOwnerHasAllocatedQuotaMock(
            ensureOwnerHasAllocatedQuotaResponses,
        ),
        getDeviceForStaticSessionId: () => null,
        getDeviceHasAllowance: () => false,
        ...patch,
    });
