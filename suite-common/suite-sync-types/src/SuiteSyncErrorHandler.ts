import { type SuiteSyncOwnerId } from '@suite-common/suite-sync-storage';

export type RelayQuotaExceededError = { type: 'RelayQuotaExceeded'; ownerId: SuiteSyncOwnerId };
export type SuiteSyncOtherError = { type: 'RelayOther'; message: string };

export type Errors = RelayQuotaExceededError | SuiteSyncOtherError;

export type SuiteSyncErrorHandler = (error: Errors) => Promise<void>;
