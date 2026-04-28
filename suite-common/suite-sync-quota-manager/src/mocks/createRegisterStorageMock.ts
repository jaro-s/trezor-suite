import { mock } from '@suite-common/dependency-injection';

import { type RegisterStorage, type RegisterStorageResult } from '../createRegisterStorage';

export const createRegisterStorageMock = (responses: RegisterStorageResult[]) => {
    const impl = mock<RegisterStorage>();
    responses.forEach(response => impl.mockResolvedValueOnce(response));

    return impl;
};
