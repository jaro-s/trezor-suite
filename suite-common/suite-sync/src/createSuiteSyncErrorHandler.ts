import {
    type CreateSuiteSyncErrorHandlerDep,
    type Errors,
    type SuiteSyncErrorHandler,
} from '@suite-common/suite-sync-types';
import { exhaustive } from '@trezor/type-utils';

export const createSuiteSyncErrorHandler =
    (deps: CreateSuiteSyncErrorHandlerDep): SuiteSyncErrorHandler =>
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
                console.error('SuiteSync relay error', error.message);

                return;

            default:
                exhaustive(error);
        }
    };
