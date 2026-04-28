export type WriteModeRequiredForAllocationErrType = {
    type: 'WriteModeRequiredForAllocation';
};
export const WriteModeRequiredForAllocation = (): WriteModeRequiredForAllocationErrType => ({
    type: 'WriteModeRequiredForAllocation',
});

export const ChallengeFailed = (): ChallengeFailedErrType => ({ type: 'ChallengeFailed' });
export type ChallengeFailedErrType = { type: 'ChallengeFailed' };

export type HttpErrType = { type: 'HttpError' };
export const HttpError = (): HttpErrType => ({ type: 'HttpError' });

/**
 * There is no more quota left for the given device.
 */
export type QuotaManagerNoQuotaLeftToAllocateErrType = { type: 'NoQuotaLeftToAllocate' };

export const NoQuotaLeftToAllocate = (): QuotaManagerNoQuotaLeftToAllocateErrType => ({
    type: 'NoQuotaLeftToAllocate',
});

export type QuotaManagerCommunicationFailedErrType = {
    type: 'QuotaManagerCommunicationFailed';
    caused: unknown;
};
export const QuotaManagerCommunicationFailed = (
    caused: unknown,
): QuotaManagerCommunicationFailedErrType => ({
    type: 'QuotaManagerCommunicationFailed',
    caused,
});

export type QuotaManagerNoQuotaErrType = {
    type: 'QuotaManagerNoQuota';
};
export const QuotaManagerNoQuota = (): QuotaManagerNoQuotaErrType => ({
    type: 'QuotaManagerNoQuota',
});
