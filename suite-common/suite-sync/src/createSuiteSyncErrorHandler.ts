import {
    type IncreaseOwnerQuota,
    type IncreaseOwnerQuotaErr,
} from '@suite-common/suite-sync-quota-manager';
import {
    type Errors,
    type SuiteSyncErrorHandler,
    type SuiteSyncOtherError,
} from '@suite-common/suite-sync-types';
import { exhaustive } from '@trezor/type-utils';

export type CreateSuiteSyncErrorHandlerDeps = {
    increaseOwnerQuota: IncreaseOwnerQuota;
    onError: (error: IncreaseOwnerQuotaErr | SuiteSyncOtherError) => void;
};

export const createSuiteSyncErrorHandler =
    (deps: CreateSuiteSyncErrorHandlerDeps): SuiteSyncErrorHandler =>
    async (error: Errors) => {
        switch (error.type) {
            case 'RelayQuotaExceeded': {
                const result = await deps.increaseOwnerQuota({ ownerId: error.ownerId });

                if (!result.success) {
                    deps.onError(result.error);
                }

                return;
            }

            case 'RelayOther':
                deps.onError(error);

                return;

            default:
                exhaustive(error);
        }
    };
