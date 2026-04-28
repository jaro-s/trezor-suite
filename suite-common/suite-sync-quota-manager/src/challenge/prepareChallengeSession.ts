import { type Result, ok } from '@trezor/type-utils';

import {
    type QuotaManagerFetchCommunicationError,
    type QuotaManagerFetchDep,
} from '../quotaManagerFetch';

type ChallengeResponse = {
    sessionId: string;
    challenge: string;
};

export type PrepareChallengeSessionResult = Result<
    ChallengeResponse,
    QuotaManagerFetchCommunicationError
>;

export type PrepareChallengeSession = () => Promise<PrepareChallengeSessionResult>;

export type PrepareChallengeSessionDep = {
    prepareChallengeSession: PrepareChallengeSession;
};

export type GenerateSessionId = () => string;

export type GenerateSessionIdDep = {
    generateSessionId: GenerateSessionId;
};

export type PrepareChallengeSessionDeps = QuotaManagerFetchDep & GenerateSessionIdDep;

export const createPrepareChallengeSession =
    (deps: PrepareChallengeSessionDeps): PrepareChallengeSession =>
    async () => {
        const sessionId = deps.generateSessionId();

        const challengeResponse = await deps.quotaManagerFetch({
            path: '/challenge',
            method: 'POST',
            body: { sessionId },
        });

        if (!challengeResponse.success) {
            return challengeResponse;
        }

        return ok({
            sessionId,
            challenge: (challengeResponse.payload as ChallengeResponse).challenge,
        });
    };
