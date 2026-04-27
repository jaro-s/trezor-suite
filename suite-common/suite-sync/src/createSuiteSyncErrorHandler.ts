import {
    type Errors,
    type IncreaseOwnerQuotaDep,
    type IncreaseOwnerQuotaErr,
    type SuiteSyncErrorHandler,
    type SuiteSyncOtherError,
} from '@suite-common/suite-sync-types';
import { exhaustive } from '@trezor/type-utils';

export type CreateSuiteSyncErrorHandlerDeps = IncreaseOwnerQuotaDep & {
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
