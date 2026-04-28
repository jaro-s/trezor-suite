import { type Dispatch } from '@reduxjs/toolkit';

import { type ProofOfDelegatedSignFailedType } from '@suite-common/delegated-identity-key-types';
import { type SuiteSyncOwnerId } from '@suite-common/suite-sync-storage';
import { type DelegatedIdentityKey } from '@suite-common/suite-types';
import { parseDeviceStaticSessionId } from '@suite-common/wallet-utils';
import { type StaticSessionId } from '@trezor/connect';
import { type Result, err, exhaustive, ok } from '@trezor/type-utils';

import { type AllocateOwnerQuotaDep } from './createAllocateOwnerQuota';
import {
    QuotaManagerCommunicationFailed,
    type QuotaManagerCommunicationFailedErrType,
    type QuotaManagerNoQuotaLeftOnDeviceToAllocateErrType,
    type WriteModeRequiredForAllocationErrType,
} from '../errors';
import { quotaManagerOwnerFetched } from '../quotaManagerActions';
import { type CheckStorageByOwnerIdDep } from './createCheckStorageByOwnerId';

export type EnsureOwnerHasAllocatedQuotaParams = {
    ownerId: SuiteSyncOwnerId;
    deviceStaticSessionId: StaticSessionId;
    delegatedKey: DelegatedIdentityKey;
    isWriteMode: boolean;
};

export type EnsureOwnerHasAllocatedQuota = (
    params: EnsureOwnerHasAllocatedQuotaParams,
) => Promise<
    Result<
        void,
        | ProofOfDelegatedSignFailedType
        | WriteModeRequiredForAllocationErrType
        | QuotaManagerNoQuotaLeftOnDeviceToAllocateErrType
        | QuotaManagerCommunicationFailedErrType
    >
>;

export type EnsureOwnerHasAllocatedQuotaDeps = {
    dispatch: Dispatch;
} & CheckStorageByOwnerIdDep &
    AllocateOwnerQuotaDep;

export type EnsureOwnerHasAllocatedQuotaDep = {
    ensureOwnerHasAllocatedQuota: EnsureOwnerHasAllocatedQuota;
};

export const createEnsureOwnerHasAllocatedQuota =
    (baseDeps: EnsureOwnerHasAllocatedQuotaDeps): EnsureOwnerHasAllocatedQuota =>
    async ({ ownerId, deviceStaticSessionId, delegatedKey, isWriteMode }) => {
        const { walletDescriptor, deviceId } = parseDeviceStaticSessionId(deviceStaticSessionId);

        const deps = {
            ...baseDeps,
            allocateOwnerQuota: () =>
                baseDeps.allocateOwnerQuota({
                    ownerId,
                    delegatedKey,
                    deviceId,
                    walletDescriptor,
                    isWriteMode,
                }),
        };

        const hasOwnerStorage = await deps.checkStorageByOwnerId({ ownerId });

        if (!hasOwnerStorage.success) {
            return err(QuotaManagerCommunicationFailed(hasOwnerStorage.error));
        }

        const { status } = hasOwnerStorage.payload;

        switch (status) {
            case 'Allocated': {
                deps.dispatch(
                    quotaManagerOwnerFetched({
                        walletDescriptor,
                        totalSpace: hasOwnerStorage.payload.totalSpace,
                    }),
                );

                return ok();
            }

            case 'NoQuota': {
                return deps.allocateOwnerQuota();
            }

            default:
                return exhaustive(status);
        }
    };
