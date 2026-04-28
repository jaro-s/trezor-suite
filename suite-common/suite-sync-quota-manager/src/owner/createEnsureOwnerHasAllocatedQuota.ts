import { type Dispatch } from '@reduxjs/toolkit';

import {
    getProofOfDelegatedIdentity,
    getPublicIdentityKeyFromDelegatedKey,
} from '@suite-common/delegated-identity-key';
import { type ProofOfDelegatedSignFailedType } from '@suite-common/delegated-identity-key-types';
import { type SuiteSyncOwnerId } from '@suite-common/suite-sync-storage';
import { type DelegatedIdentityKey } from '@suite-common/suite-types';
import { parseDeviceStaticSessionId } from '@suite-common/wallet-utils';
import { type StaticSessionId } from '@trezor/connect';
import { type Result, err, exhaustive, ok } from '@trezor/type-utils';

import { type PrepareChallengeSessionDep } from '../challenge/prepareChallengeSession';
import {
    DEFAULT_DEVICE_SIZE_QUOTA,
    EVOLU_SIGN_ADD_SPACE_TO_OWNER_REQUEST_HEADER,
} from '../constants';
import {
    NoQuotaLeftToAllocate,
    QuotaManagerCommunicationFailed,
    type QuotaManagerCommunicationFailedErrType,
    type QuotaManagerNoQuotaLeftToAllocateErrType,
    WriteModeRequiredForAllocation,
    type WriteModeRequiredForAllocationErrType,
} from '../errors';
import { quotaManagerOwnerFetched } from '../quotaManagerActions';
import { type CheckStorageByOwnerIdDep } from '../storage/createCheckStorageByOwnerId';
import { type TransferStorageDep } from '../storage/createTransferStorage';
import { getAccountIncrementSizeQuota } from '../util/getAccountIncrementSizeQuota';
import { prepareMessageBufferEvoluAddSpaceToOwner } from '../util/prepareMessageBufferEvoluAddSpaceToOwner';

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
        | QuotaManagerNoQuotaLeftToAllocateErrType
        | QuotaManagerCommunicationFailedErrType
    >
>;
type GetLeftDeviceQuota = (deviceId: string) => number | undefined;

export type EnsureOwnerHasAllocatedQuotaDeps = {
    dispatch: Dispatch;
    getLeftDeviceQuota: GetLeftDeviceQuota;
} & TransferStorageDep &
    PrepareChallengeSessionDep &
    CheckStorageByOwnerIdDep;

export type EnsureOwnerHasAllocatedQuotaDep = {
    ensureOwnerHasAllocatedQuota: EnsureOwnerHasAllocatedQuota;
};

export const createEnsureOwnerHasAllocatedQuota =
    (deps: EnsureOwnerHasAllocatedQuotaDeps): EnsureOwnerHasAllocatedQuota =>
    async ({ ownerId, deviceStaticSessionId, delegatedKey, isWriteMode }) => {
        const { walletDescriptor, deviceId } = parseDeviceStaticSessionId(deviceStaticSessionId);

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

            }

            default:
                return exhaustive(status)
        }


        
    };
