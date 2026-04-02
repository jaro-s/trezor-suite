import { ok } from '@trezor/type-utils';

import { type EnsureDeviceHasQuota } from '../src/createEnsureDeviceHasQuota';

type EnsureDeviceHasQuotaResult = Awaited<ReturnType<EnsureDeviceHasQuota>>;

const DEFAULT_RESPONSES: EnsureDeviceHasQuotaResult[] = [ok()];

export const createEnsureDeviceHasQuotaMock = (
    responses: EnsureDeviceHasQuotaResult[] = DEFAULT_RESPONSES,
): jest.Mock<ReturnType<EnsureDeviceHasQuota>, Parameters<EnsureDeviceHasQuota>> => {
    const mock = jest.fn<ReturnType<EnsureDeviceHasQuota>, Parameters<EnsureDeviceHasQuota>>();
    responses.forEach(response => mock.mockResolvedValueOnce(response));

    return mock;
};
