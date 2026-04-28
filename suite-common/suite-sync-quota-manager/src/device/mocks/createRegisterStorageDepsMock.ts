import { createMockDeps } from '@suite-common/dependency-injection';

import { createQuotaManagerFetchMock } from '../../mocks/createQuotaManagerFetchMock';
import { type QuotaManagerFetchResult } from '../../quotaManagerFetch';
import { type RegisterStorageDeps } from '../createRegisterStorage';

type CreateRegisterStorageDepsMockParams = {
    quotaManagerFetchResponses: QuotaManagerFetchResult[];
    patch?: Partial<RegisterStorageDeps>;
};

export const createRegisterStorageDepsMock = ({
    quotaManagerFetchResponses,
    patch = {},
}: CreateRegisterStorageDepsMockParams) =>
    createMockDeps<RegisterStorageDeps>({
        dispatch: jest.fn(),
        quotaManagerFetch: createQuotaManagerFetchMock(quotaManagerFetchResponses),
        ...patch,
    });
