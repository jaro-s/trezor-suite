import { createConsole, createConsoleFormatter } from '@evolu/common';
import { createRun } from '@evolu/web';
import { type Dispatch } from '@reduxjs/toolkit';

import { type DesktopAnalyticsDep } from '@suite/analytics';
import { type EnsureDelegatedIdentityKeyDep } from '@suite-common/delegated-identity-key-types';
import { isTrezorDeviceWithState, selectSelectedDevice } from '@suite-common/device';
import { type PlatformEncryptionDep } from '@suite-common/platform-encryption';
import {
    createSuiteSyncCompositionRoot,
    createSuiteSyncErrorHandler,
} from '@suite-common/suite-sync';
import {
    createEvoluErrorHandler,
    createEvoluInstanceFactory,
    createEvoluStorageFactory,
    evoluCreateSuiteSyncOwner,
} from '@suite-common/suite-sync-evolu';
import { type FetchDep } from '@suite-common/suite-sync-quota-manager';
import { type SuiteSync } from '@suite-common/suite-sync-types';
import { parseDeviceStaticSessionId } from '@suite-common/wallet-utils';
import { type TrezorConnect } from '@trezor/connect';
import { err } from '@trezor/type-utils';

import { createEvoluDepsFixed } from './createEvoluDepsFixed';
import { createTurnOnDesktopSuiteSync } from './turnOnDesktopSuiteSync';

type SuiteSyncDesktopCompositionRootDeps = {
    getState: () => any;
    dispatch: Dispatch;
    trezorConnect: TrezorConnect;
} & PlatformEncryptionDep &
    EnsureDelegatedIdentityKeyDep &
    DesktopAnalyticsDep &
    FetchDep;

export const createSuiteSyncDesktopCompositionRoot = (
    deps: SuiteSyncDesktopCompositionRootDeps,
): SuiteSync => {
    const console = createConsole({
        level: 'warn',
        formatter: createConsoleFormatter()({ timestampFormat: 'absolute' }),
    });

    const evoluDeps = createEvoluDepsFixed({ console });

    const run = createRun(evoluDeps);
    // This sets up Evolu as a SuiteSync Storage. We provide a factory that
    // accepts `suiteSyncErrorHandler` and creates the evolu instance accordingly.
    const suiteSync = createSuiteSyncCompositionRoot({
        ...deps,
        createSuiteStorage: createEvoluStorageFactory({
            createEvoluInstance: createEvoluInstanceFactory({ run }),
        }),
        createSuiteSyncOwner: evoluCreateSuiteSyncOwner,
        analytics: deps.analytics,
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

    return {
        ...suiteSync,
        turnOnSuiteSync: createTurnOnDesktopSuiteSync({
            turnOnSuiteSync: suiteSync.turnOnSuiteSync,
            analytics: deps.analytics,
        }),
    };
};
