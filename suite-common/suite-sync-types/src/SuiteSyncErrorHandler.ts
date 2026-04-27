import {
    type QuotaManagerCommunicationFailedErrType,
    type QuotaManagerNoQuotaLeftToAllocateErrType,
} from '@suite-common/suite-sync-quota-manager';
import { type SuiteSyncOwnerId } from '@suite-common/suite-sync-storage';
import { type Result } from '@trezor/type-utils';

export type OwnerDeviceNotAvailableErrType = { type: 'OwnerDeviceNotAvailable' };

export type IncreaseOwnerQuotaErr =
    | OwnerDeviceNotAvailableErrType
    | QuotaManagerNoQuotaLeftToAllocateErrType
    | QuotaManagerCommunicationFailedErrType;

export type IncreaseOwnerQuota = (params: {
    ownerId: SuiteSyncOwnerId;
}) => Promise<Result<void, IncreaseOwnerQuotaErr>>;

export type IncreaseOwnerQuotaDep = {
    increaseOwnerQuota: IncreaseOwnerQuota;
};

export type RelayQuotaExceededError = { type: 'RelayQuotaExceeded'; ownerId: SuiteSyncOwnerId };
export type SuiteSyncOtherError = { type: 'RelayOther'; message: string };

export type Errors = RelayQuotaExceededError | SuiteSyncOtherError;

export type SuiteSyncErrorHandler = (error: Errors) => Promise<void>;
