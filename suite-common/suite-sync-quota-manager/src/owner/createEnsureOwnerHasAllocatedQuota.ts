import { type Dispatch } from '@reduxjs/toolkit';

import { type ProofOfDelegatedSignFailedType } from '@suite-common/delegated-identity-key-types';
import { type SuiteSyncOwnerId } from '@suite-common/suite-sync-storage';
import { parseDeviceStaticSessionId } from '@suite-common/wallet-utils';
import { type StaticSessionId } from '@trezor/connect';
import { type Result, err, exhaustive, ok } from '@trezor/type-utils';

import { type IncreaseOwnerQuotaDep } from './createIncreaseOwnerQuota';
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
    IncreaseOwnerQuotaDep;

export type EnsureOwnerHasAllocatedQuotaDep = {
    ensureOwnerHasAllocatedQuota: EnsureOwnerHasAllocatedQuota;
};

export const createEnsureOwnerHasAllocatedQuota =
    (deps: EnsureOwnerHasAllocatedQuotaDeps): EnsureOwnerHasAllocatedQuota =>
    async ({ ownerId, deviceStaticSessionId, isWriteMode }) => {
        const { walletDescriptor } = parseDeviceStaticSessionId(deviceStaticSessionId);

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
                if (isWriteMode === false) {
                    return ok();
                }

                return deps.increaseOwnerQuota({
                    ownerId,
                });
            }

            default:
                return exhaustive(status);
        }
    };
