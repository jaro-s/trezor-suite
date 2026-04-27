import { mock } from '@suite-common/dependency-injection';

import { type GenerateSessionId } from '../prepareChallengeSession';

/**
 * Returns a jest.fn() implementing GenerateSessionId that yields the given
 * session ids in order via mockReturnValueOnce. After the list is exhausted,
 * the mock returns undefined (jest's default), which surfaces as a clear
 * failure rather than reusing a stale id.
 */
export const createGenerateSessionIdMock = (sessionIds: string[]) => {
    const impl = mock<GenerateSessionId>();
    sessionIds.forEach(sessionId => impl.mockReturnValueOnce(sessionId));

    return impl;
};
