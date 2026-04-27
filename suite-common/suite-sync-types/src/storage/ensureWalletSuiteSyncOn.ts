import { type ProofOfDelegatedSignFailedType } from '@suite-common/delegated-identity-key-types';
import { type SuiteSyncStorage, type SuiteSyncUpdateError } from '@suite-common/suite-sync-storage';
import { type DeviceCancelledErrType, type DeviceErrorType } from '@suite-common/suite-types';
import { type StaticSessionId } from '@trezor/connect-common';
import { type Result } from '@trezor/type-utils';

import { type SuiteSyncUnavailableOnDeviceErrorType } from '../ensureSuiteSyncKeys';
import { type QuotaManagerNoQuotaLeftToAllocateErrType } from '../quotaManager/ensureOwnerHasAllocatedQuotaThunk';
import {
    type QuotaManagerCommunicationFailedErrType,
    type QuotaManagerNoQuotaErrType,
    type WriteModeRequiredForAllocationErrType,
} from '../quotaManager/quotaManagerTypes';

export type SuiteSyncFirmwareUpgradeNeededDeviceErrorType = {
    type: 'SuiteSyncFirmwareUpgradeNeededDeviceErrorType';
};

export type EnsureWalletSuiteSyncOnParams = {
    deviceStaticSessionId: StaticSessionId;
    isWriteMode: boolean;
};

/**
 * Those are all errors that may happen during ensuring that SuiteSync is in on.
 * Typically most of them needs to be propagated all the way up into platform specific
 * code (components), as we need user's interaction/notification.
 */
export type EnsureWalletSuiteSyncOnErrors =
    | SuiteSyncUnavailableOnDeviceErrorType
    | SuiteSyncFirmwareUpgradeNeededDeviceErrorType
    | DeviceErrorType
    | DeviceCancelledErrType
    | ProofOfDelegatedSignFailedType
    | WriteModeRequiredForAllocationErrType
    | QuotaManagerCommunicationFailedErrType
    | QuotaManagerNoQuotaErrType
    | QuotaManagerNoQuotaLeftToAllocateErrType;

export type EnsureWalletSuiteSyncOn = (
    params: EnsureWalletSuiteSyncOnParams,
) => Promise<Result<SuiteSyncStorage, EnsureWalletSuiteSyncOnErrors>>;

export type EnsureWalletSuiteSyncOnDep = { ensureWalletSuiteSyncOn: EnsureWalletSuiteSyncOn };

export type SuiteSyncUserFacingErrorType =
    | Exclude<EnsureWalletSuiteSyncOnErrors['type'], 'WriteModeRequiredForAllocation'>
    | SuiteSyncUpdateError['type']
    | QuotaManagerCommunicationFailedErrType['type']
    | QuotaManagerNoQuotaErrType['type']
    | QuotaManagerNoQuotaLeftToAllocateErrType['type'];
