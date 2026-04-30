import { mock } from '@suite-common/dependency-injection';
import { type Result } from '@trezor/type-utils';

import { type IncreaseOwnerQuota, type IncreaseOwnerQuotaErr } from '../createIncreaseOwnerQuota';

type IncreaseOwnerQuotaResult = Result<void, IncreaseOwnerQuotaErr>;

export const createIncreaseOwnerQuotaMock = (responses: IncreaseOwnerQuotaResult[]) => {
    const impl = mock<IncreaseOwnerQuota>();
    responses.forEach(response => impl.mockResolvedValueOnce(response));

    return impl;
};
