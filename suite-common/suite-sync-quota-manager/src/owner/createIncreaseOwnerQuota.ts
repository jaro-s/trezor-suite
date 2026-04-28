import {
    getProofOfDelegatedIdentity,
    getPublicIdentityKeyFromDelegatedKey,
} from '@suite-common/delegated-identity-key';
import {
    type EnsureDelegatedIdentityKeyDep,
    type ProofOfDelegatedSignFailedType,
} from '@suite-common/delegated-identity-key-types';
import { isTrezorDeviceWithState, selectSelectedDevice } from '@suite-common/device';
import { type SuiteSyncOwnerId } from '@suite-common/suite-sync-storage';
import { asDelegatedIdentityKey } from '@suite-common/suite-types';
import { parseDeviceStaticSessionId } from '@suite-common/wallet-utils';
import { type Result, err, ok } from '@trezor/type-utils';

import { type PrepareChallengeSessionFetchDep } from '../challenge/prepareChallengeSession';
import {
    DEFAULT_DEVICE_SIZE_QUOTA,
    EVOLU_SIGN_ADD_SPACE_TO_OWNER_REQUEST_HEADER,
} from '../constants';
import { type TransferStorageFetchDep } from './createTransferStorageFetch';
import {
    QuotaManagerCommunicationFailed,
    type QuotaManagerCommunicationFailedErrType,
    QuotaManagerNoQuotaLeftOnDeviceToAllocate,
    type QuotaManagerNoQuotaLeftOnDeviceToAllocateErrType,
} from '../errors';
import { getAccountIncrementSizeQuota } from './getAccountIncrementSizeQuota';
import { prepareMessageBufferEvoluAddSpaceToOwner } from './prepareMessageBufferEvoluAddSpaceToOwner';

export type IncreaseOwnerQuotaErr =
    | QuotaManagerNoQuotaLeftOnDeviceToAllocateErrType
    | ProofOfDelegatedSignFailedType
    | QuotaManagerCommunicationFailedErrType;

export type IncreaseOwnerQuotaParams = {
    ownerId: SuiteSyncOwnerId;
};

export type IncreaseOwnerQuota = (
    params: IncreaseOwnerQuotaParams,
) => Promise<Result<void, IncreaseOwnerQuotaErr>>;

type GetLeftDeviceQuota = (deviceId: string) => number | undefined;

export type IncreaseOwnerQuotaDeps = {
    getLeftDeviceQuota: GetLeftDeviceQuota;
    getState: () => any; // Todo: temporary, see: https://github.com/trezor/trezor-suite/issues/27049
} & EnsureDelegatedIdentityKeyDep &
    TransferStorageFetchDep &
    PrepareChallengeSessionFetchDep;

export type IncreaseOwnerQuotaDep = {
    increaseOwnerQuota: IncreaseOwnerQuota;
};

export const createIncreaseOwnerQuota =
    (deps: IncreaseOwnerQuotaDeps): IncreaseOwnerQuota =>
    async ({ ownerId }) => {
        // Todo: ------ this shall be REFACTORED OUT! [https://github.com/trezor/trezor-suite/issues/27049] ------
        const device = selectSelectedDevice(deps.getState());

        if (!device || !isTrezorDeviceWithState(device)) {
            // Temporary, no better error
            return err(QuotaManagerNoQuotaLeftOnDeviceToAllocate());
        }

        const { walletDescriptor } = parseDeviceStaticSessionId(device.state.staticSessionId);
        // Todo: ------ end of temporary code ------

        const leftDeviceQuota = deps.getLeftDeviceQuota(device.id);
        const sizeToAllocate = getAccountIncrementSizeQuota({
            unspentStorage: leftDeviceQuota ?? DEFAULT_DEVICE_SIZE_QUOTA,
        });

        if (sizeToAllocate === 0) {
            return err(QuotaManagerNoQuotaLeftOnDeviceToAllocate());
        }

        const delegatedKey = await deps.ensureDelegatedIdentityKey({ device });

        if (!delegatedKey.success) {
            return ok();
        }

        const delegatedPublicKey = getPublicIdentityKeyFromDelegatedKey(delegatedKey.payload);

        const sessionChallenge = await deps.prepareChallengeSessionFetch();

        if (!sessionChallenge.success) {
            return err(QuotaManagerCommunicationFailed(sessionChallenge.error));
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
            return proof;
        }

        const transferStorageResult = await deps.transferStorageFetch({
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
            return err(QuotaManagerCommunicationFailed(transferStorageResult.error));
        }

        return ok();
    };
