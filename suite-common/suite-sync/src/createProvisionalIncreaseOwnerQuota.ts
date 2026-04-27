import { isTrezorDeviceWithState, selectSelectedDevice } from '@suite-common/device';
import { type IncreaseOwnerQuota as InnerIncreaseOwnerQuota } from '@suite-common/suite-sync-quota-manager';
import { type IncreaseOwnerQuota } from '@suite-common/suite-sync-types';
import { parseDeviceStaticSessionId } from '@suite-common/wallet-utils';
import { err } from '@trezor/type-utils';

export type CreateProvisionalIncreaseOwnerQuotaDeps = {
    getState: () => any;
    increaseOwnerQuota: InnerIncreaseOwnerQuota;
};

/**
 * PROVISIONAL: bridges the error-handler's IncreaseOwnerQuota (just `ownerId`)
 * to the quota-manager's richer signature (`ownerId`, `device`, `deviceId`,
 * `walletDescriptor`) by reading the currently selected device.
 *
 * This will be refactored once we have a proper ownerId -> device mapping.
 */
export const createProvisionalIncreaseOwnerQuota =
    (deps: CreateProvisionalIncreaseOwnerQuotaDeps): IncreaseOwnerQuota =>
    ({ ownerId }) => {
        const device = selectSelectedDevice(deps.getState());
        if (!device || !isTrezorDeviceWithState(device)) {
            return Promise.resolve(err({ type: 'OwnerDeviceNotAvailable' }));
        }

        const { walletDescriptor } = parseDeviceStaticSessionId(device.state.staticSessionId);

        return deps.increaseOwnerQuota({
            ownerId,
            device,
            deviceId: device.id,
            walletDescriptor,
        });
    };
