import { createMockDeps } from '@suite-common/dependency-injection';

import { createGenerateSessionIdMock } from './createGenerateSessionIdMock';
import { createQuotaManagerFetchMock } from './createQuotaManagerFetchMock';
import { type PrepareChallengeSessionDeps } from '../src/challenge/prepareChallengeSession';

export const createPrepareChallengeSessionDepsMock = (
    patch: Partial<PrepareChallengeSessionDeps> = {},
) =>
    createMockDeps<PrepareChallengeSessionDeps>({
        generateSessionId: createGenerateSessionIdMock(),
        quotaManagerFetch: createQuotaManagerFetchMock(),
        ...patch,
    });
