import { createConsole, createConsoleFormatter } from '@evolu/common';
import { createRun } from '@evolu/react-native';
import { createEvoluDeps } from '@evolu/react-native/expo-sqlite';
import { type Dispatch } from '@reduxjs/toolkit';

import { type EnsureDelegatedIdentityKeyDep } from '@suite-common/delegated-identity-key-types';
import { isTrezorDeviceWithState, selectSelectedDevice } from '@suite-common/device';
import { type PlatformEncryptionDep } from '@suite-common/platform-encryption';
import {
    type SuiteSyncAnalyticsDep,
    createSuiteSyncCompositionRoot,
    createSuiteSyncErrorHandler,
} from '@suite-common/suite-sync';
import {
    createEvoluErrorHandler,
    createEvoluInstanceFactory,
    createEvoluStorageFactory,
    evoluCreateSuiteSyncOwner,
} from '@suite-common/suite-sync-evolu';
import { type SuiteSync } from '@suite-common/suite-sync-types';
import { parseDeviceStaticSessionId } from '@suite-common/wallet-utils';
import { type TrezorConnect } from '@trezor/connect';
import { err } from '@trezor/type-utils';

type SuiteSyncNativeCompositionRootDeps = {
    getState: () => any;
    dispatch: Dispatch;
    trezorConnect: TrezorConnect;
} & SuiteSyncAnalyticsDep &
    PlatformEncryptionDep &
    EnsureDelegatedIdentityKeyDep;

export const createSuiteSyncNativeCompositionRoot = (
    deps: SuiteSyncNativeCompositionRootDeps,
): SuiteSync => {
    const console = createConsole({
        level: 'warn',
        formatter: createConsoleFormatter()({ timestampFormat: 'absolute' }),
    });

    const evoluDeps = createEvoluDeps({ console });
    const run = createRun(evoluDeps);

    const suiteSync = createSuiteSyncCompositionRoot({
        ...deps,
        createSuiteStorage: createEvoluStorageFactory({
            createEvoluInstance: createEvoluInstanceFactory({ run }),
        }),
        createSuiteSyncOwner: evoluCreateSuiteSyncOwner,
    });

    const suiteSyncErrorHandler = createSuiteSyncErrorHandler({
        dispatch: deps.dispatch,
        increaseOwnerQuota: ({ ownerId }) => {
            const device = selectSelectedDevice(deps.getState());
            if (!device || !isTrezorDeviceWithState(device)) {
                return Promise.resolve(err({ type: 'OwnerDeviceNotAvailable' }));
            }

            const { walletDescriptor } = parseDeviceStaticSessionId(device.state.staticSessionId);

            return suiteSync.increaseOwnerQuota({
                ownerId,
                device,
                deviceId: device.id,
                walletDescriptor,
            });
        },
    });
    evoluDeps.evoluError.subscribe(
        createEvoluErrorHandler(evoluDeps.evoluError, suiteSyncErrorHandler),
    );

    return suiteSync;
};
