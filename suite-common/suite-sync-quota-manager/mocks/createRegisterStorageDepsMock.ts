import { createMockDeps } from '@suite-common/dependency-injection';

import { createQuotaManagerFetchMock } from './createQuotaManagerFetchMock';
import { type RegisterStorageDeps } from '../src/storage/createRegisterStorage';

export const createRegisterStorageDepsMock = (patch: Partial<RegisterStorageDeps> = {}) =>
    createMockDeps<RegisterStorageDeps>({
        dispatch: jest.fn(),
        getQuotaManagerBaseUrl: () => 'https://quota-manager.test',
        quotaManagerFetch: createQuotaManagerFetchMock(),
        ...patch,
    });
