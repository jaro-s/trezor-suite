export { createSuiteSyncQuotaManagerCompositionRoot } from './createSuiteSyncQuotaManagerCompositionRoot';
export type { EnsureQuotaDep } from './createEnsureQuota';
export type {
    IncreaseOwnerQuota,
    IncreaseOwnerQuotaDep,
    IncreaseOwnerQuotaErr,
} from './owner/createIncreaseOwnerQuota';
export type { GetOwnerHasAllowanceDep } from './owner/getOwnerHasAllowance';
export type { FetchDep } from './quotaManagerFetch';

export type {
    QuotaManagerCommunicationFailedErrType,
    QuotaManagerNoQuotaLeftOnDeviceToAllocateErrType,
    WriteModeRequiredForAllocationErrType,
} from './errors';

export {
    enforceQuotaManagerUpdated,
    eraseFetchedData,
    noQuotaLeftWarningDismissed,
    suiteSyncQuotaManagerActions,
    updateQuotaManagerBaseUrl,
} from './quotaManagerActions';

export {
    selectEnforceQuotaManager,
    selectOwnersAllowance,
    selectQuotaManagerBaseUrl,
    selectRegisteredDevices,
    selectShouldDisplayOutOfQuotaAlert,
} from './quotaManagerSelectors';

export {
    quotaManagerInitialState,
    suiteSyncQuotaManagerReducer,
    type SuiteSyncQuotaManagerState,
} from './quotaManagerReducer';

export {
    DEFAULT_QUOTA_MANAGER_URL,
    DEV_QUOTA_MANAGER_URL,
    PRODUCTION_QUOTA_MANAGER_URL,
} from './constants';
