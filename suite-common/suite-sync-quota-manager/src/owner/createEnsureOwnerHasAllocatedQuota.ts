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
import { type Result, err, ok } from '@trezor/type-utils';

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

type GetQuotaManagerBaseUrl = () => string | null;
type GetLeftDeviceQuota = (deviceId: string) => number | undefined;

export type EnsureOwnerHasAllocatedQuotaDeps = {
    dispatch: Dispatch;
    getQuotaManagerBaseUrl: GetQuotaManagerBaseUrl;
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

        const hasOwnerStorage = await deps.checkStorageByOwnerId({
            baseUrl: deps.getQuotaManagerBaseUrl(),
            ownerId,
        });

        if (!hasOwnerStorage.success) {
            const isHttp404 =
                hasOwnerStorage.error.type === 'HttpError' && hasOwnerStorage.error.code === 404;

            if (!isHttp404) {
                return err(QuotaManagerCommunicationFailed(hasOwnerStorage.error));
            }
        }

        // Storage exists for this owner
        if (hasOwnerStorage.success && hasOwnerStorage.payload.status === 'Allocated') {
            deps.dispatch(
                quotaManagerOwnerFetched({
                    walletDescriptor,
                    totalSpace: hasOwnerStorage.payload.totalSpace,
                }),
            );

            return ok();
        }

        if (isWriteMode === false) {
            // we want to allocate on-demand
            return err(WriteModeRequiredForAllocation());
        }

        const leftDeviceQuota = deps.getLeftDeviceQuota(deviceId);
        const sizeToAllocate = getAccountIncrementSizeQuota({
            unspentStorage: leftDeviceQuota ?? DEFAULT_DEVICE_SIZE_QUOTA,
        });

        if (sizeToAllocate === 0) {
            return err(NoQuotaLeftToAllocate());
        }

        const sessionChallenge = await deps.prepareChallengeSession({
            baseUrl: deps.getQuotaManagerBaseUrl(),
        });

        if (!sessionChallenge.success) {
            return err(QuotaManagerCommunicationFailed(sessionChallenge.error));
        }

        const proofOfDelegatedIdentity = getProofOfDelegatedIdentity({
            delegatedKey,
            header: EVOLU_SIGN_ADD_SPACE_TO_OWNER_REQUEST_HEADER,
            appendMessageBuffer: prepareMessageBufferEvoluAddSpaceToOwner({
                publicKey: getPublicIdentityKeyFromDelegatedKey(delegatedKey),
                ownerId,
                challenge: sessionChallenge.payload.challenge,
                size: sizeToAllocate,
            }),
        });

        if (!proofOfDelegatedIdentity.success) {
            return proofOfDelegatedIdentity;
        }

        const transferStorageResult = await deps.transferStorage({
            params: {
                ownerId,
                publicKey: getPublicIdentityKeyFromDelegatedKey(delegatedKey),
                proof: proofOfDelegatedIdentity.payload,
                size: sizeToAllocate,
                challenge: sessionChallenge.payload.challenge,
                sessionId: sessionChallenge.payload.sessionId,
            },
            walletDescriptor,
            deviceId,
        });

        if (!transferStorageResult.success) {
            return err(QuotaManagerCommunicationFailed(transferStorageResult.error));
        }

        return ok();
    };
