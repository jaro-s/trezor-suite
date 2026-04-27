import { isTrezorDeviceWithState, selectSelectedDevice } from '@suite-common/device';
import { parseDeviceStaticSessionId } from '@suite-common/wallet-utils';
import { ok } from '@trezor/type-utils';

import { type IncreaseOwnerQuota, type IncreaseOwnerQuotaDep } from './createIncreaseOwnerQuota';

export type CreateProvisionalIncreaseOwnerQuotaDeps = {
    getState: () => any;
} & IncreaseOwnerQuotaDep;

/**
 * PROVISIONAL: bridges the error-handler's IncreaseOwnerQuota (just `ownerId`)
 * to the quota-manager's richer signature (`ownerId`, `device`, `deviceId`,
 * `walletDescriptor`) by reading the currently selected device.
 *
 * This will be refactored once we have a proper ownerId -> device mapping.
 */
export const createProvisionalIncreaseOwnerQuota =
    (deps: CreateProvisionalIncreaseOwnerQuotaDeps): IncreaseOwnerQuota =>
    async ({ ownerId }) => {
        const device = selectSelectedDevice(deps.getState());

        if (!device || !isTrezorDeviceWithState(device)) {
            return ok(); // Todo: silently ignoring, will be refactored anyway
        }

        const { walletDescriptor } = parseDeviceStaticSessionId(device.state.staticSessionId);

        return await deps.increaseOwnerQuota({
            ownerId,
            device,
            deviceId: device.id,
            walletDescriptor,
        });
    };
