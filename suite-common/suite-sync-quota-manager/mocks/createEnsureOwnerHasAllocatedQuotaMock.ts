import { type EnsureOwnerHasAllocatedQuota } from '@suite-common/suite-sync-types';
import { ok } from '@trezor/type-utils';

type EnsureOwnerHasAllocatedQuotaResult = Awaited<ReturnType<EnsureOwnerHasAllocatedQuota>>;

const DEFAULT_RESPONSES: EnsureOwnerHasAllocatedQuotaResult[] = [ok()];

export const createEnsureOwnerHasAllocatedQuotaMock = (
    responses: EnsureOwnerHasAllocatedQuotaResult[] = DEFAULT_RESPONSES,
): jest.Mock<
    ReturnType<EnsureOwnerHasAllocatedQuota>,
    Parameters<EnsureOwnerHasAllocatedQuota>
> => {
    const mock = jest.fn<
        ReturnType<EnsureOwnerHasAllocatedQuota>,
        Parameters<EnsureOwnerHasAllocatedQuota>
    >();
    responses.forEach(response => mock.mockResolvedValueOnce(response));

    return mock;
};
