import { createMockDeps } from '@suite-common/dependency-injection';

import { createEnsureDeviceHasQuotaMock } from './createEnsureDeviceHasQuotaMock';
import { createEnsureOwnerHasAllocatedQuotaMock } from './createEnsureOwnerHasAllocatedQuotaMock';
import { type EnsureQuotaDeps } from '../src/createEnsureQuota';

export const createEnsureQuotaDepsMock = (patch: Partial<EnsureQuotaDeps> = {}) =>
    createMockDeps<EnsureQuotaDeps>({
        ensureDeviceHasQuota: createEnsureDeviceHasQuotaMock(),
        ensureOwnerHasAllocatedQuota: createEnsureOwnerHasAllocatedQuotaMock(),
        getDeviceForStaticSessionId: () => null,
        getDeviceHasAllowance: () => false,
        ...patch,
    });
