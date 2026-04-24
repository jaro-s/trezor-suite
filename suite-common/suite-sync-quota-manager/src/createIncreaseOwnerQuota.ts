import {
    getProofOfDelegatedIdentity,
    getPublicIdentityKeyFromDelegatedKey,
} from '@suite-common/delegated-identity-key';
import { type EnsureDelegatedIdentityKeyDep } from '@suite-common/delegated-identity-key-types';
import { type SuiteSyncOwnerId } from '@suite-common/suite-sync-storage';
import {
    type QuotaManagerCommunicationFailedErrType,
    type QuotaManagerNoQuotaLeftToAllocateErrType,
} from '@suite-common/suite-sync-types';
import { type TrezorDeviceWithState, asDelegatedIdentityKey } from '@suite-common/suite-types';
import { type WalletDescriptor } from '@suite-common/wallet-types';
import { type Result, err, ok } from '@trezor/type-utils';

import { type PrepareChallengeSessionDep } from './challenge/prepareChallengeSession';
import {
    DEFAULT_DEVICE_SIZE_QUOTA,
    EVOLU_SIGN_ADD_SPACE_TO_OWNER_REQUEST_HEADER,
} from './constants';
import { quotaManagerCommunicationFailed } from './errors';
import { type TransferStorageDep } from './storage/createTransferStorage';
import { getAccountIncrementSizeQuota } from './util/getAccountIncrementSizeQuota';
import { prepareMessageBufferEvoluAddSpaceToOwner } from './util/prepareMessageBufferEvoluAddSpaceToOwner';

export type IncreaseOwnerQuotaParams = {
    ownerId: SuiteSyncOwnerId;
    device: TrezorDeviceWithState;
    deviceId: string;
    walletDescriptor: WalletDescriptor;
};

export type IncreaseOwnerQuota = (
    params: IncreaseOwnerQuotaParams,
) => Promise<
    Result<void, QuotaManagerNoQuotaLeftToAllocateErrType | QuotaManagerCommunicationFailedErrType>
>;

type GetQuotaManagerBaseUrl = () => string | null;
type GetLeftDeviceQuota = (deviceId: string) => number | undefined;

export type IncreaseOwnerQuotaDeps = {
    getQuotaManagerBaseUrl: GetQuotaManagerBaseUrl;
    getLeftDeviceQuota: GetLeftDeviceQuota;
} & EnsureDelegatedIdentityKeyDep &
    TransferStorageDep &
    PrepareChallengeSessionDep;

export type IncreaseOwnerQuotaDep = {
    increaseOwnerQuota: IncreaseOwnerQuota;
};

export const createIncreaseOwnerQuota =
    (deps: IncreaseOwnerQuotaDeps): IncreaseOwnerQuota =>
    async ({ ownerId, device, deviceId, walletDescriptor }) => {
        const leftDeviceQuota = deps.getLeftDeviceQuota(deviceId);
        const sizeToAllocate = getAccountIncrementSizeQuota({
            unspentStorage: leftDeviceQuota ?? DEFAULT_DEVICE_SIZE_QUOTA,
        });

        if (sizeToAllocate === 0) {
            return err({
                type: 'NoQuotaLeftToAllocate',
            });
        }

        const delegatedKey = await deps.ensureDelegatedIdentityKey({ device });

        if (!delegatedKey.success) {
            return ok();
        }

        const delegatedPublicKey = getPublicIdentityKeyFromDelegatedKey(delegatedKey.payload);

        const sessionChallenge = await deps.prepareChallengeSession({
            baseUrl: deps.getQuotaManagerBaseUrl(),
        });

        if (!sessionChallenge.success) {
            return err(quotaManagerCommunicationFailed(sessionChallenge.error));
        }

        const proof = getProofOfDelegatedIdentity({
            delegatedKey: asDelegatedIdentityKey(delegatedKey.payload),
            header: EVOLU_SIGN_ADD_SPACE_TO_OWNER_REQUEST_HEADER,
            appendMessageBuffer: prepareMessageBufferEvoluAddSpaceToOwner({
                ownerId,
                challenge: sessionChallenge.payload.challenge,
                size: sizeToAllocate,
                publicKey: delegatedPublicKey,
            }),
        });

        if (!proof.success) {
            return err(quotaManagerCommunicationFailed(proof.error));
        }

        const transferStorageResult = await deps.transferStorage({
            deviceId: device.id,
            walletDescriptor,
            params: {
                ownerId,
                size: sizeToAllocate,
                proof: proof.payload,
                sessionId: sessionChallenge.payload.sessionId,
                challenge: sessionChallenge.payload.challenge,
                publicKey: delegatedPublicKey,
            },
        });

        if (!transferStorageResult.success) {
            return err(quotaManagerCommunicationFailed(transferStorageResult.error));
        }

        return ok();
    };
