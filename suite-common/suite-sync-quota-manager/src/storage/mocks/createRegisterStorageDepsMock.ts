import { createMockDeps } from '@suite-common/dependency-injection';

import { createQuotaManagerFetchMock } from '../../mocks/createQuotaManagerFetchMock';
import { type RegisterStorageDeps } from '../createRegisterStorage';

type CreateRegisterStorageDepsMockParams = {
    quotaManagerFetchResponses: Parameters<typeof createQuotaManagerFetchMock>[0];
    patch?: Partial<RegisterStorageDeps>;
};

export const createRegisterStorageDepsMock = ({
    quotaManagerFetchResponses,
    patch = {},
}: CreateRegisterStorageDepsMockParams) =>
    createMockDeps<RegisterStorageDeps>({
        dispatch: jest.fn(),
        getQuotaManagerBaseUrl: () => 'https://quota-manager.test',
        quotaManagerFetch: createQuotaManagerFetchMock(quotaManagerFetchResponses),
        ...patch,
    });
