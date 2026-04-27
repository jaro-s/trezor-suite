import { createMockDeps } from '@suite-common/dependency-injection';
import { type EnsureOwnerHasAllocatedQuota } from '@suite-common/suite-sync-types';

import { createEnsureDeviceHasQuotaMock } from './createEnsureDeviceHasQuotaMock';
import { createEnsureOwnerHasAllocatedQuotaMock } from './createEnsureOwnerHasAllocatedQuotaMock';
import { type EnsureDeviceHasQuota } from '../createEnsureDeviceHasQuota';
import { type EnsureQuotaDeps } from '../createEnsureQuota';

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
        getDeviceHasAllowance: () => false,
        ...patch,
    });
