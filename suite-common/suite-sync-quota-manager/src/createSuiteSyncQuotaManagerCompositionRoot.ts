import { type Dispatch } from '@reduxjs/toolkit';

import { type EnsureDelegatedIdentityKeyDep } from '@suite-common/delegated-identity-key-types';
import { toGetter } from '@suite-common/dependency-injection';
import { type TrezorConnect } from '@trezor/connect';

import { createPrepareChallengeSession } from './challenge/prepareChallengeSession';
import { createEnsureQuota } from './createEnsureQuota';
import { createCheckStorageByPublicKeyFetch } from './device/createCheckStorageByPublicKeyFetch';
import { createEnsureDeviceHasQuota } from './device/createEnsureDeviceHasQuota';
import { createRegisterDevice } from './device/createRegisterDevice';
import { createRegisterDeviceFetch } from './device/createRegisterDeviceFetch';
import { type GetDeviceForStaticSessionIdDep } from './device/getDeviceForStaticSessionId';
import { type GetHasDeviceRegisteredAndOwnerHasAllowance } from './getHasDeviceRegisteredAndOwnerHasAllowance';
import { type GetIsUsingTrezorRelayDep } from './getIsDefaultRelayUrlSet';
import { type GetIsQuotaManagerEnabled } from './getIsQuotaManagerEnabled';
import { createAllocateOwnerQuota } from './owner/createAllocateOwnerQuota';
import { createCheckStorageByOwnerId } from './owner/createCheckStorageByOwnerId';
import { createEnsureOwnerHasAllocatedQuota } from './owner/createEnsureOwnerHasAllocatedQuota';
import { createIncreaseOwnerQuota } from './owner/createIncreaseOwnerQuota';
import { createTransferStorageFetch } from './owner/createTransferStorageFetch';
import { type GetOwnerHasAllowance } from './owner/getOwnerHasAllowance';
import { type FetchDep, createQuotaManagerFetch } from './quotaManagerFetch';
import {
    type WithSuiteSyncQuotaManagerState,
    selectEnforceQuotaManager,
    selectHasDeviceRegisteredAndOwnerHasAllowance,
    selectHasOwnerAllowance,
    selectLeftDeviceQuota,
    selectQuotaManagerBaseUrl,
} from './quotaManagerSelectors';
import { generateSessionId } from './session/generateSessionId';

type CreateSuiteSyncQuotaManagerCompositionRootDeps = {
    dispatch: Dispatch;
    getState: () => WithSuiteSyncQuotaManagerState;
} & GetDeviceForStaticSessionIdDep &
    GetIsUsingTrezorRelayDep &
    EnsureDelegatedIdentityKeyDep & {
        trezorConnect: Pick<TrezorConnect, 'evoluSignRegistrationRequest'>;
    } & FetchDep;

export const createSuiteSyncQuotaManagerCompositionRoot = (
    deps: CreateSuiteSyncQuotaManagerCompositionRootDeps,
) => {
    const quotaManagerFetch = createQuotaManagerFetch({
        fetch: deps.fetch,
        getQuotaManagerBaseUrl: toGetter(deps.getState, selectQuotaManagerBaseUrl),
    });

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

    // Challenge

    const prepareChallengeSession = createPrepareChallengeSession({
        generateSessionId,
        quotaManagerFetch,
    });

    // Device
    const checkStorageByPublicKeyFetch = createCheckStorageByPublicKeyFetch({ quotaManagerFetch });

    const registerDeviceFetch = createRegisterDeviceFetch({
        quotaManagerFetch,
    });

    const registerDevice = createRegisterDevice({
        dispatch: deps.dispatch,
        prepareChallengeSession,
        registerDeviceFetch,
        trezorConnect: deps.trezorConnect,
    });

    const ensureDeviceHasQuota = createEnsureDeviceHasQuota({
        checkStorageByPublicKeyFetch,
        dispatch: deps.dispatch,
        registerDevice,
    });

    // Owner

    const checkStorageByOwnerId = createCheckStorageByOwnerId({
        quotaManagerFetch,
    });

    const transferStorageFetch = createTransferStorageFetch({
        dispatch: deps.dispatch,
        quotaManagerFetch,
    });

    const allocateOwnerQuota = createAllocateOwnerQuota({
        getLeftDeviceQuota,
        prepareChallengeSession,
        transferStorageFetch,
    });

    const ensureOwnerHasAllocatedQuota = createEnsureOwnerHasAllocatedQuota({
        allocateOwnerQuota,
        checkStorageByOwnerId,
        dispatch: deps.dispatch,
    });

    // Main

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
        transferStorageFetch,
    });

    return {
        ensureQuota,
        getHasDeviceRegisteredAndOwnerHasAllowance,
        getOwnerHasAllowance,
        increaseOwnerQuota,
    };
};
