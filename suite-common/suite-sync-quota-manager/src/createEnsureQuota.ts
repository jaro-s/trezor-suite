import { type ProofOfDelegatedSignFailedType } from '@suite-common/delegated-identity-key-types';
import { isTrezorDeviceWithState } from '@suite-common/device';
import { type SuiteSyncOwner } from '@suite-common/suite-sync-storage';
import { type DelegatedIdentityKey } from '@suite-common/suite-types';
import { parseDeviceStaticSessionId } from '@suite-common/wallet-utils';
import { type StaticSessionId } from '@trezor/connect';
import { type Result, err, ok } from '@trezor/type-utils';
import { isNotNull, isNotNullOrUndefined } from '@trezor/utils';

import { type EnsureDeviceHasQuotaDep } from './device/createEnsureDeviceHasQuota';
import { type GetDeviceForStaticSessionIdDep } from './device/getDeviceForStaticSessionId';
import { type GetDeviceHasAllowanceDep } from './device/getDeviceHasAllowance';
import {
    type QuotaManagerCommunicationFailedErrType,
    type QuotaManagerNoQuotaErrType,
    type QuotaManagerNoQuotaLeftToAllocateErrType,
    WriteModeRequiredForAllocation,
    type WriteModeRequiredForAllocationErrType,
} from './errors';
import { type EnsureOwnerHasAllocatedQuotaDep } from './owner/createEnsureOwnerHasAllocatedQuota';

export type EnsureQuotaDeps = GetDeviceForStaticSessionIdDep &
    EnsureDeviceHasQuotaDep &
    EnsureOwnerHasAllocatedQuotaDep &
    GetDeviceHasAllowanceDep;

export type EnsureQuotaParams = {
    deviceStaticSessionId: StaticSessionId;
    delegatedKey: DelegatedIdentityKey;
    owner: SuiteSyncOwner;
    isWriteMode: boolean;
};

export type EnsureQuota = (
    params: EnsureQuotaParams,
) => Promise<
    Result<
        void,
        | ProofOfDelegatedSignFailedType
        | WriteModeRequiredForAllocationErrType
        | QuotaManagerCommunicationFailedErrType
        | QuotaManagerNoQuotaLeftToAllocateErrType
        | QuotaManagerNoQuotaErrType
    >
>;

export type EnsureQuotaDep = {
    ensureQuota: EnsureQuota;
};

/**
 * Responsibility:
 * - Ensure relay quota is allocated before write-capable Suite Sync operations proceed.
 */
export const createEnsureQuota =
    (deps: EnsureQuotaDeps): EnsureQuota =>
    async ({ deviceStaticSessionId, delegatedKey, owner, isWriteMode }) => {
        const { walletDescriptor } = parseDeviceStaticSessionId(deviceStaticSessionId);

        const device = deps.getDeviceForStaticSessionId(deviceStaticSessionId);

        if (device === null || !isNotNullOrUndefined(device.id)) {
            return ok();
        }

        if (deps.getDeviceHasAllowance(device.id, walletDescriptor)) {
            return ok();
        }

        if (isNotNull(device) && isTrezorDeviceWithState(device)) {
            const deviceQuota = await deps.ensureDeviceHasQuota({
                device,
                delegatedKey,
            });

            if (!deviceQuota.success) {
                return err(deviceQuota.error);
            }
        }

        const allocatedQuota = await deps.ensureOwnerHasAllocatedQuota({
            deviceStaticSessionId,
            ownerId: owner.ownerId,
            delegatedKey,
            isWriteMode,
        });

        if (
            !allocatedQuota.success &&
            allocatedQuota.error.type === 'WriteModeRequiredForAllocation'
        ) {
            return err(WriteModeRequiredForAllocation());
        }

        if (!allocatedQuota.success) {
            return err(allocatedQuota.error);
        }

        return ok();
    };
