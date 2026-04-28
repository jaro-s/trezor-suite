export const createAllocateOwnerQuota = () => {
    () => {
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

        const sessionChallenge = await deps.prepareChallengeSession();

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
};
