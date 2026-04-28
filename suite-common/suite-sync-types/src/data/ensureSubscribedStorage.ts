import {
    type QuotaManagerCommunicationFailedErrType,
    type QuotaManagerNoQuotaLeftOnDeviceToAllocateErrType,
    type WriteModeRequiredForAllocationErrType,
} from '@suite-common/suite-sync-quota-manager-types';
import { type SuiteSyncSchema, type SuiteSyncStorage } from '@suite-common/suite-sync-storage';
import { type DeviceCancelledErrType, type DeviceErrorType } from '@suite-common/suite-types';
import { type WalletDescriptor } from '@suite-common/wallet-types';
import { type StaticSessionId } from '@trezor/connect-common';
import { type Result } from '@trezor/type-utils';

import { type SuiteSyncUnavailableOnDeviceErrorType } from '../ensureSuiteSyncKeys';

type EnsureSubscribedStorageParams = {
    deviceStaticSessionId: StaticSessionId;
    isWriteMode: boolean;
};

export type Subscriptions = {
    [K in keyof SuiteSyncSchema]: (
        deviceStaticSessionId: StaticSessionId,
        entity: SuiteSyncSchema[K][],
    ) => void;
};

export type SuiteSyncListener = {
    onEntityChange: Subscriptions;
    onUnsubscribe: ({ walletDescriptor }: { walletDescriptor: WalletDescriptor }) => void;
};

export type SuiteSyncListenerDep = {
    suiteSyncListener: SuiteSyncListener;
};

export type EnsureSubscribedStorage = (
    params: EnsureSubscribedStorageParams,
) => Promise<
    Result<
        SuiteSyncStorage,
        | SuiteSyncUnavailableOnDeviceErrorType
        | DeviceErrorType
        | DeviceCancelledErrType
        | WriteModeRequiredForAllocationErrType
        | QuotaManagerCommunicationFailedErrType
        | QuotaManagerNoQuotaLeftOnDeviceToAllocateErrType
    >
>;

export type EnsureSubscribedStorageDep = {
    ensureSubscribedStorage: EnsureSubscribedStorage;
};
