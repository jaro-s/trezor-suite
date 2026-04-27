import { mock } from '@suite-common/dependency-injection';

import {
    type CheckStorageByOwnerId,
    type CheckStorageByOwnerIdResult,
} from '../createCheckStorageByOwnerId';

export const createCheckStorageByOwnerIdMock = (responses: CheckStorageByOwnerIdResult[]) => {
    const impl = mock<CheckStorageByOwnerId>();
    responses.forEach(response => impl.mockResolvedValueOnce(response));

    return impl;
};
