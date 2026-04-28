import { type Dispatch } from '@reduxjs/toolkit';

import { type EnsureDelegatedIdentityKeyDep } from '@suite-common/delegated-identity-key-types';
import { type TrezorConnect } from '@trezor/connect';

import { createPrepareChallengeSession } from './challenge/prepareChallengeSession';
import { createEnsureQuota } from './createEnsureQuota';
import { createEnsureDeviceHasQuota } from './device/createEnsureDeviceHasQuota';
import { createRegisterDevice } from './device/createRegisterDevice';
import { type GetDeviceForStaticSessionIdDep } from './device/getDeviceForStaticSessionId';
import { type GetIsUsingTrezorRelayDep } from './getIsDefaultRelayUrlSet';
import { type GetIsQuotaManagerEnabled } from './getIsQuotaManagerEnabled';
import { type GetHasDeviceRegisteredAndOwnerHasAllowance } from './getHasDeviceRegisteredAndOwnerHasAllowance';
import { createEnsureOwnerHasAllocatedQuota } from './owner/createEnsureOwnerHasAllocatedQuota';
import { createIncreaseOwnerQuota } from './owner/createIncreaseOwnerQuota';
import { type GetOwnerHasAllowance } from './owner/getOwnerHasAllowance';
import { type QuotaManagerFetchDep } from './quotaManagerFetch';
import {
    type WithSuiteSyncQuotaManagerState,
    selectEnforceQuotaManager,
    selectHasDeviceRegisteredAndOwnerHasAllowance,
    selectHasOwnerAllowance,
    selectLeftDeviceQuota,
} from './quotaManagerSelectors';
import { createCheckStorageByOwnerId } from './storage/createCheckStorageByOwnerId';
import { createCheckStorageByPublicKey } from './storage/createCheckStorageByPublicKey';
import { createRegisterStorage } from './storage/createRegisterStorage';
import { createTransferStorage } from './storage/createTransferStorage';
import { generateSessionId } from './util/generateSessionId';

type CreateSuiteSyncQuotaManagerCompositionRootDeps = {
    dispatch: Dispatch;
    getState: () => WithSuiteSyncQuotaManagerState;
} & GetDeviceForStaticSessionIdDep &
    GetIsUsingTrezorRelayDep &
    EnsureDelegatedIdentityKeyDep & {
        trezorConnect: Pick<TrezorConnect, 'evoluSignRegistrationRequest'>;
    } & QuotaManagerFetchDep;

export const createSuiteSyncQuotaManagerCompositionRoot = (
    deps: CreateSuiteSyncQuotaManagerCompositionRootDeps,
) => {
    // We only want to use QM for our own relay servers. In case custom URL has been set, QM is ignored,
    // unless enforceQuotaManager is set (used for e2e tests with a local relay).
    const getIsQuotaManagerEnabled: GetIsQuotaManagerEnabled = () =>
        deps.getIsUsingTrezorRelay() || selectEnforceQuotaManager(deps.getState());

    const getHasDeviceRegisteredAndOwnerHasAllowance: GetHasDeviceRegisteredAndOwnerHasAllowance = (
        deviceId,
        walletDescriptor,
    ) =>
        !getIsQuotaManagerEnabled() ||
        selectHasDeviceRegisteredAndOwnerHasAllowance(deps.getState(), deviceId, walletDescriptor);

    const getOwnerHasAllowance: GetOwnerHasAllowance = walletDescriptor =>
        !getIsQuotaManagerEnabled() || selectHasOwnerAllowance(deps.getState(), walletDescriptor);

    const getLeftDeviceQuota = (deviceId: string) =>
        selectLeftDeviceQuota(deps.getState(), deviceId);
    const prepareChallengeSession = createPrepareChallengeSession({
        generateSessionId,
        quotaManagerFetch: deps.quotaManagerFetch,
    });
    const checkStorageByPublicKey = createCheckStorageByPublicKey({
        quotaManagerFetch: deps.quotaManagerFetch,
    });
    const checkStorageByOwnerId = createCheckStorageByOwnerId({
        quotaManagerFetch: deps.quotaManagerFetch,
    });

    const registerStorage = createRegisterStorage({
        dispatch: deps.dispatch,
        quotaManagerFetch: deps.quotaManagerFetch,
    });

    const registerDevice = createRegisterDevice({
        prepareChallengeSession,
        registerStorage,
        trezorConnect: deps.trezorConnect,
    });

    const transferStorage = createTransferStorage({
        dispatch: deps.dispatch,
        quotaManagerFetch: deps.quotaManagerFetch,
    });

    const ensureDeviceHasQuota = createEnsureDeviceHasQuota({
        checkStorageByPublicKey,
        dispatch: deps.dispatch,
        registerDevice,
    });

    const ensureOwnerHasAllocatedQuota = createEnsureOwnerHasAllocatedQuota({
        checkStorageByOwnerId,
        dispatch: deps.dispatch,
        getLeftDeviceQuota,
        prepareChallengeSession,
        transferStorage,
    });

    const ensureQuota = createEnsureQuota({
        ensureDeviceHasQuota,
        ensureOwnerHasAllocatedQuota,
        getDeviceForStaticSessionId: deps.getDeviceForStaticSessionId,
        getHasDeviceRegisteredAndOwnerHasAllowance,
    });

    const increaseOwnerQuota = createIncreaseOwnerQuota({
        ensureDelegatedIdentityKey: deps.ensureDelegatedIdentityKey,
        getLeftDeviceQuota,
        prepareChallengeSession,
        transferStorage,
    });

    return {
        ensureQuota,
        getHasDeviceRegisteredAndOwnerHasAllowance,
        getOwnerHasAllowance,
        increaseOwnerQuota,
    };
};
