import { type GenerateSessionId } from '../src/challenge/prepareChallengeSession';

const DEFAULT_SESSION_IDS = ['mocked-session-id'];

/**
 * Returns a jest.fn() implementing GenerateSessionId that yields the given
 * session ids in order via mockReturnValueOnce. After the list is exhausted,
 * the mock returns undefined (jest's default), which surfaces as a clear
 * failure rather than reusing a stale id.
 */
export const createGenerateSessionIdMock = (
    sessionIds: string[] = DEFAULT_SESSION_IDS,
): jest.Mock<ReturnType<GenerateSessionId>, Parameters<GenerateSessionId>> => {
    const mock = jest.fn<ReturnType<GenerateSessionId>, Parameters<GenerateSessionId>>();
    sessionIds.forEach(sessionId => mock.mockReturnValueOnce(sessionId));

    return mock;
};
