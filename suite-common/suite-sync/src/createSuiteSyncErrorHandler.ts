import {
    type CreateSuiteSyncErrorHandlerDep,
    type Errors,
    type IncreaseOwnerQuotaErr,
    type SuiteSyncErrorHandler,
} from '@suite-common/suite-sync-types';
import { exhaustive } from '@trezor/type-utils';

const handleIncreaseOwnerQuotaErr = (error: IncreaseOwnerQuotaErr) => {
    const errorType = error.type;
    switch (errorType) {
        case 'OwnerDeviceNotAvailable':
            console.error(
                'SuiteSync: cannot increase owner quota, selected device is not available',
            );

            return;

        case 'NoQuotaLeftToAllocate':
            console.error('SuiteSync: no quota left to allocate for owner');

            return;

        case 'QuotaManagerCommunicationFailed':
            console.error('SuiteSync: quota manager communication failed', error.caused);

            return;

        default:
            exhaustive(errorType);
    }
};

export const createSuiteSyncErrorHandler =
    (deps: CreateSuiteSyncErrorHandlerDep): SuiteSyncErrorHandler =>
    (error: Errors) => {
        switch (error.type) {
            case 'RelayQuotaExceeded':
                void deps.increaseOwnerQuota({ ownerId: error.ownerId }).then(result => {
                    if (!result.success) {
                        handleIncreaseOwnerQuotaErr(result.error);
                    }
                });

                return;

            case 'RelayOther':
                console.error('SuiteSync relay error', error.message);

                return;

            default:
                exhaustive(error);
        }
    };
