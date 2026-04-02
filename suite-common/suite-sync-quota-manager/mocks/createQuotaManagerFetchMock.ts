import { ok } from '@trezor/type-utils';

import { type QuotaManagerFetch, type QuotaManagerFetchResult } from '../src/quotaManagerFetch';

const DEFAULT_RESPONSES: QuotaManagerFetchResult[] = [ok({})];

/**
 * Returns a jest.fn() implementing QuotaManagerFetch that resolves to the
 * given responses in order via mockResolvedValueOnce. After the list is
 * exhausted, the mock resolves to undefined (jest's default), which surfaces
 * as a clear failure rather than reusing a stale response.
 */
export const createQuotaManagerFetchMock = (
    responses: QuotaManagerFetchResult[] = DEFAULT_RESPONSES,
): jest.Mock<ReturnType<QuotaManagerFetch>, Parameters<QuotaManagerFetch>> => {
    const mock = jest.fn<ReturnType<QuotaManagerFetch>, Parameters<QuotaManagerFetch>>();
    responses.forEach(response => mock.mockResolvedValueOnce(response));

    return mock;
};
