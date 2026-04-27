import { mock } from '@suite-common/dependency-injection';

import { type TransferStorage, type TransferStorageResult } from '../createTransferStorage';

export const createTransferStorageMock = (responses: TransferStorageResult[]) => {
    const impl = mock<TransferStorage>();
    responses.forEach(response => impl.mockResolvedValueOnce(response));

    return impl;
};
