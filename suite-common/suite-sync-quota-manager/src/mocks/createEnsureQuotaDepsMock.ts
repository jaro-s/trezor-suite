import { createMockDeps } from '@suite-common/dependency-injection';

import { createEnsureDeviceHasQuotaMock } from './createEnsureDeviceHasQuotaMock';
import { createEnsureOwnerHasAllocatedQuotaMock } from './createEnsureOwnerHasAllocatedQuotaMock';
import { type EnsureQuotaDeps } from '../createEnsureQuota';
import { type EnsureDeviceHasQuota } from '../device/createEnsureDeviceHasQuota';
import { type EnsureOwnerHasAllocatedQuota } from '../owner/createEnsureOwnerHasAllocatedQuota';

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
