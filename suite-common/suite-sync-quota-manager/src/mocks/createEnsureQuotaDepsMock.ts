import { createMockDeps } from '@suite-common/dependency-injection';

import { type EnsureQuotaDeps } from '../createEnsureQuota';
import { type EnsureDeviceHasQuota } from '../device/createEnsureDeviceHasQuota';
import { createEnsureDeviceHasQuotaMock } from '../device/mocks/createEnsureDeviceHasQuotaMock';
import { type EnsureOwnerHasAllocatedQuota } from '../owner/createEnsureOwnerHasAllocatedQuota';
import { createEnsureOwnerHasAllocatedQuotaMock } from '../owner/mocks/createEnsureOwnerHasAllocatedQuotaMock';

type EnsureDeviceHasQuotaResult = Awaited<ReturnType<EnsureDeviceHasQuota>>;
type EnsureOwnerHasAllocatedQuotaResult = Awaited<ReturnType<EnsureOwnerHasAllocatedQuota>>;

type CreateEnsureQuotaDepsMockParams = {
    ensureDeviceHasQuotaResponses: EnsureDeviceHasQuotaResult[];
    ensureOwnerHasAllocatedQuotaResponses: EnsureOwnerHasAllocatedQuotaResult[];
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
        getHasDeviceRegisteredAndOwnerHasAllowance: () => false,
        ...patch,
    });
