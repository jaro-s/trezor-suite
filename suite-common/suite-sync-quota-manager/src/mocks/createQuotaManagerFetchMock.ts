import { mock } from '@suite-common/dependency-injection';

import { type QuotaManagerFetch, type QuotaManagerFetchResult } from '../quotaManagerFetch';

/**
 * Returns a jest.fn() implementing QuotaManagerFetch that resolves to the
 * given responses in order via mockResolvedValueOnce. After the list is
 * exhausted, the mock resolves to undefined (jest's default), which surfaces
 * as a clear failure rather than reusing a stale response.
 */
export const createQuotaManagerFetchMock = (responses: QuotaManagerFetchResult[]) => {
    const impl = mock<QuotaManagerFetch>();
    responses.forEach(response => impl.mockResolvedValueOnce(response));

    return impl;
};
