import { createMockDeps } from '@suite-common/dependency-injection';

import { createGenerateSessionIdMock } from './createGenerateSessionIdMock';
import { createQuotaManagerFetchMock } from '../../mocks/createQuotaManagerFetchMock';
import { type QuotaManagerFetchResult } from '../../quotaManagerFetch';
import { type PrepareChallengeSessionDeps } from '../prepareChallengeSession';

type CreatePrepareChallengeSessionDepsMockParams = {
    sessionIds: string[];
    quotaManagerFetchResponses: QuotaManagerFetchResult[];
    patch?: Partial<PrepareChallengeSessionDeps>;
};

export const createPrepareChallengeSessionDepsMock = ({
    sessionIds,
    quotaManagerFetchResponses,
    patch = {},
}: CreatePrepareChallengeSessionDepsMockParams) =>
    createMockDeps<PrepareChallengeSessionDeps>({
        generateSessionId: createGenerateSessionIdMock(sessionIds),
        quotaManagerFetch: createQuotaManagerFetchMock(quotaManagerFetchResponses),
        ...patch,
    });
