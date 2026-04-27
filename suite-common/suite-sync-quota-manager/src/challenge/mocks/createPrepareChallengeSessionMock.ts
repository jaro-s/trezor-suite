import { mock } from '@suite-common/dependency-injection';

import {
    type PrepareChallengeSession,
    type PrepareChallengeSessionResult,
} from '../prepareChallengeSession';

export const createPrepareChallengeSessionMock = (responses: PrepareChallengeSessionResult[]) => {
    const impl = mock<PrepareChallengeSession>();
    responses.forEach(response => impl.mockResolvedValueOnce(response));

    return impl;
};
