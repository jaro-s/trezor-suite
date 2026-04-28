import { isTrezorDeviceWithState, selectSelectedDevice } from '@suite-common/device';
import { type SuiteSyncOwnerId } from '@suite-common/suite-sync-storage';
import { parseDeviceStaticSessionId } from '@suite-common/wallet-utils';
import { type Result, ok } from '@trezor/type-utils';

import { type IncreaseOwnerQuotaDep as IncreaseOwnerQuotaInnerDep } from './createIncreaseOwnerQuota';
import {
    type QuotaManagerCommunicationFailedErrType,
    type QuotaManagerNoQuotaLeftToAllocateErrType,
} from '../errors';

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

export type CreateProvisionalIncreaseOwnerQuotaDeps = {
    getState: () => any;
} & IncreaseOwnerQuotaInnerDep;

/**
 * PROVISIONAL: bridges the error-handler's IncreaseOwnerQuota (just `ownerId`)
 * to the quota-manager's richer signature (`ownerId`, `device`, `deviceId`,
 * `walletDescriptor`) by reading the currently selected device.
 *
 * This will be refactored once we have a proper ownerId -> device mapping.
 */
export const createProvisionalIncreaseOwnerQuota =
    (deps: CreateProvisionalIncreaseOwnerQuotaDeps) =>
    async ({ ownerId }: { ownerId: SuiteSyncOwnerId }) => {
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
