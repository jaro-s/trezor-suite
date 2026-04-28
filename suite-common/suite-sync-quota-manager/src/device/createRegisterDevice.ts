import {
    getProofOfDelegatedIdentity,
    getPublicIdentityKeyFromDelegatedKey,
} from '@suite-common/delegated-identity-key';
import { type ProofOfDelegatedSignFailedType } from '@suite-common/delegated-identity-key-types';
import { DeviceError } from '@suite-common/device';
import {
    type DelegatedIdentityKey,
    type DeviceErrorType,
    type TrezorDeviceWithState,
} from '@suite-common/suite-types';
import { type TrezorConnect } from '@trezor/connect';
import { type Result, err, ok } from '@trezor/type-utils';

import { type PrepareChallengeSessionDep } from '../challenge/prepareChallengeSession';
import { DEFAULT_DEVICE_SIZE_QUOTA } from '../constants';
import {
    QuotaManagerCommunicationFailed,
    type QuotaManagerCommunicationFailedErrType,
} from '../errors';
import { type RegisterStorageDep } from '../storage/createRegisterStorage';
import { prepareMessageBufferEvoluSignRegistrationRequest } from '../util/prepareMessageBufferEvoluSignRegistrationRequest';

const EVOLU_SIGN_REGISTRATION_REQUEST_HEADER = 'EvoluSignRegistrationRequest';

export type RegisterDeviceParams = {
    device: TrezorDeviceWithState;
    delegatedKey: DelegatedIdentityKey;
};

export type RegisterDevice = (
    params: RegisterDeviceParams,
) => Promise<
    Result<
        void,
        QuotaManagerCommunicationFailedErrType | ProofOfDelegatedSignFailedType | DeviceErrorType
    >
>;

export type RegisterDeviceDeps = {
    trezorConnect: Pick<TrezorConnect, 'evoluSignRegistrationRequest'>;
} & RegisterStorageDep &
    PrepareChallengeSessionDep;

export type RegisterDeviceDep = {
    registerDevice: RegisterDevice;
};

export const createRegisterDevice =
    (deps: RegisterDeviceDeps): RegisterDevice =>
    async ({ device, delegatedKey }) => {
        const delegatedKeyPublic = getPublicIdentityKeyFromDelegatedKey(delegatedKey);

        const sessionChallenge = await deps.prepareChallengeSession();

        if (!sessionChallenge.success) {
            return err(QuotaManagerCommunicationFailed(sessionChallenge.error));
        }

        const proofOfDelegatedIdentity = getProofOfDelegatedIdentity({
            delegatedKey,
            header: EVOLU_SIGN_REGISTRATION_REQUEST_HEADER,
            appendMessageBuffer: prepareMessageBufferEvoluSignRegistrationRequest({
                challenge: sessionChallenge.payload.challenge,
                size: DEFAULT_DEVICE_SIZE_QUOTA,
            }),
        });

        if (!proofOfDelegatedIdentity.success) {
            return proofOfDelegatedIdentity;
        }

        // Optiga singing call
        const registrationRequestResult = await deps.trezorConnect.evoluSignRegistrationRequest({
            challenge_from_server: sessionChallenge.payload.challenge,
            size_to_acquire: DEFAULT_DEVICE_SIZE_QUOTA,
            proof_of_delegated_identity: proofOfDelegatedIdentity.payload,
        });

        if (!registrationRequestResult.success) {
            return err(DeviceError(registrationRequestResult.error.message));
        }

        const registerStorageResult = await deps.registerStorage({
            deviceId: device.id,
            size: DEFAULT_DEVICE_SIZE_QUOTA,
            certificateChain: {
                deviceCert: registrationRequestResult.payload.certificate_chain[0],
                caCert: registrationRequestResult.payload.certificate_chain[1],
            },
            challenge: sessionChallenge.payload.challenge,
            proof: registrationRequestResult.payload.signature,
            sessionId: sessionChallenge.payload.sessionId,
            deviceModel: device.features.internal_model,
            publicKey: delegatedKeyPublic,
        });

        if (!registerStorageResult.success) {
            return err(QuotaManagerCommunicationFailed(registerStorageResult.error));
        }

        return ok();
    };
