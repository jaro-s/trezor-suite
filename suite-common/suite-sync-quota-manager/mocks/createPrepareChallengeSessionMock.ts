import { ok } from '@trezor/type-utils';

import {
    type PrepareChallengeSession,
    type PrepareChallengeSessionResult,
} from '../src/challenge/prepareChallengeSession';

const DEFAULT_RESPONSES: PrepareChallengeSessionResult[] = [
    ok({ sessionId: 'mocked-session-id', challenge: 'mocked-challenge' }),
];

export const createPrepareChallengeSessionMock = (
    responses: PrepareChallengeSessionResult[] = DEFAULT_RESPONSES,
): jest.Mock<ReturnType<PrepareChallengeSession>, Parameters<PrepareChallengeSession>> => {
    const mock = jest.fn<
        ReturnType<PrepareChallengeSession>,
        Parameters<PrepareChallengeSession>
    >();
    responses.forEach(response => mock.mockResolvedValueOnce(response));

    return mock;
};
