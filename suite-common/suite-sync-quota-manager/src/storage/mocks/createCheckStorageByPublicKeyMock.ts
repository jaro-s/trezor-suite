import { mock } from '@suite-common/dependency-injection';

import {
    type CheckStorageByPublicKey,
    type CheckStorageByPublicKeyResult,
} from '../createCheckStorageByPublicKey';

export const createCheckStorageByPublicKeyMock = (responses: CheckStorageByPublicKeyResult[]) => {
    const impl = mock<CheckStorageByPublicKey>();
    responses.forEach(response => impl.mockResolvedValueOnce(response));

    return impl;
};
