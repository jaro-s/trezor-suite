/**
 * QuotaManager API services / functions.
 */
export { createPrepareChallengeSession } from './challenge/prepareChallengeSession';
export { createCheckStorageByOwnerId } from './storage/createCheckStorageByOwnerId';
export { createCheckStorageByPublicKey } from './storage/createCheckStorageByPublicKey';
export { createQuotaManagerFetch } from './quotaManagerFetch';
export { createRegisterStorage } from './storage/createRegisterStorage';
export type { RegisterStorage, RegisterStorageDep } from './storage/createRegisterStorage';
export { createTransferStorage } from './storage/createTransferStorage';
export type { TransferStorage, TransferStorageDep } from './storage/createTransferStorage';
export type { FetchDep, QuotaManagerFetch, QuotaManagerFetchDep } from './quotaManagerFetch';
export { createEnsureDeviceHasQuota } from './createEnsureDeviceHasQuota';
export type { EnsureDeviceHasQuota, EnsureDeviceHasQuotaDep } from './createEnsureDeviceHasQuota';
export {
    createEnsureOwnerHasAllocatedQuota,
    NoQuotaLeftToAllocate,
    WriteModeRequiredForAllocation,
} from './createEnsureOwnerHasAllocatedQuota';
export type {
    ChallengeFailedErrType,
    EnsureOwnerHasAllocatedQuota,
    EnsureOwnerHasAllocatedQuotaDep,
    EnsureOwnerHasAllocatedQuotaParams,
    HttpErrType,
    ProofOfDelegatedIdentityFailedErrType,
    QuotaManagerNoQuotaLeftToAllocateErrType,
} from './createEnsureOwnerHasAllocatedQuota';
export { createIncreaseOwnerQuota } from './createIncreaseOwnerQuota';
export type { IncreaseOwnerQuota, IncreaseOwnerQuotaDep } from './createIncreaseOwnerQuota';
export { createProvisionalIncreaseOwnerQuota } from './createProvisionalIncreaseOwnerQuota';
export type { EnsureQuotaDep } from './createEnsureQuota';
export { createSuiteSyncQuotaManagerCompositionRoot } from './createSuiteSyncQuotaManagerCompositionRoot';
export type { GetOwnerHasAllowanceDep } from './getOwnerHasAllowance';
export type {
    QuotaManagerCommunicationFailedErrType,
    QuotaManagerNoQuotaErrType,
    WriteModeRequiredForAllocationErrType,
} from './quotaManagerTypes';

/**
 * Actions.
 */
export {
    updateQuotaManagerBaseUrl,
    quotaManagerDeviceFetched,
    suiteSyncQuotaManagerActions,
    eraseFetchedData,
    noQuotaLeftWarningDismissed,
    enforceQuotaManagerUpdated,
} from './quotaManagerActions';

/**
 * Selectors.
 */
export {
    selectQuotaManagerBaseUrl,
    selectOwnersAllowance,
    selectRegisteredDevices,
    selectIsDeviceRegistered,
    selectHasOwnerAllowance,
    selectHasDeviceAllowance,
    selectLeftDeviceQuota,
    selectDeviceDismissedNoQuotaLeftWarning,
    selectShouldDisplayOutOfQuotaAlert,
    selectEnforceQuotaManager,
} from './quotaManagerSelectors';
export type { WithSuiteSyncQuotaManagerState } from './quotaManagerSelectors';

/**
 * Reducers.
 */
export {
    suiteSyncQuotaManagerReducer,
    quotaManagerInitialState,
    type SuiteSyncQuotaManagerState,
} from './quotaManagerReducer';

/**
 * Constants.
 */
export {
    DEFAULT_DEVICE_SIZE_QUOTA,
    DEFAULT_QUOTA_MANAGER_URL,
    DEV_QUOTA_MANAGER_URL,
    PRODUCTION_QUOTA_MANAGER_URL,
} from './constants';

export { getAccountIncrementSizeQuota } from './util/getAccountIncrementSizeQuota';
