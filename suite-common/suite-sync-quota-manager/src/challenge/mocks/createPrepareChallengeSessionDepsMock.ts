import { createMockDeps } from '@suite-common/dependency-injection';

import { createGenerateSessionIdMock } from './createGenerateSessionIdMock';
import { createQuotaManagerFetchMock } from '../../mocks/createQuotaManagerFetchMock';
import { type PrepareChallengeSessionDeps } from '../prepareChallengeSession';

type CreatePrepareChallengeSessionDepsMockParams = {
    sessionIds: Parameters<typeof createGenerateSessionIdMock>[0];
    quotaManagerFetchResponses: Parameters<typeof createQuotaManagerFetchMock>[0];
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
