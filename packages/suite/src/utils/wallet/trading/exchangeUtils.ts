import { type ExchangeTrade, type ExchangeTradeQuoteRequest } from 'invity-api';

import {
    TRADING_EXCHANGE_COMPARATOR_KYC_FILTER_NO_KYC,
    type TradingComposedTransactionInfo,
    type TradingExchangeInfoSelector,
    type TradingExchangeKycFilter,
} from '@suite-common/trading';
import { getLocationOrigin, isDesktop } from '@trezor/env-utils';
import { desktopApi } from '@trezor/suite-desktop-api';

import { KYC_DEX, KYC_NO_KYC } from 'src/constants/wallet/trading/kyc';
import { type Account } from 'src/types/wallet';

export type ExchangeQuotesByType = {
    fixed: ExchangeTrade[];
    float: ExchangeTrade[];
    dex: ExchangeTrade[];
};

export const groupExchangeQuotesByType = ({
    quotes,
    exchangeInfo,
    kycFilter,
}: {
    quotes: ExchangeTrade[] | undefined;
    exchangeInfo: TradingExchangeInfoSelector | undefined;
    kycFilter: TradingExchangeKycFilter;
}): ExchangeQuotesByType =>
    (quotes ?? []).reduce<ExchangeQuotesByType>(
        (groups, quote) => {
            const providerInfo = exchangeInfo?.providerInfos[quote.exchange || ''];

            if (quote.isDex) {
                groups.dex.push(quote);
            } else {
                if (
                    kycFilter === TRADING_EXCHANGE_COMPARATOR_KYC_FILTER_NO_KYC &&
                    providerInfo?.kycPolicyType !== KYC_NO_KYC &&
                    providerInfo?.kycPolicyType !== KYC_DEX
                )
                    return groups;

                if (providerInfo?.isFixedRate) {
                    groups.fixed.push(quote);
                } else {
                    groups.float.push(quote);
                }
            }

            return groups;
        },
        { fixed: [], float: [], dex: [] },
    );

export const createQuoteLink = async (
    request: ExchangeTradeQuoteRequest,
    account: Account,
    composedInfo: TradingComposedTransactionInfo,
    orderId: string,
) => {
    const assetPrefix = process.env.ASSET_PREFIX || '';
    const locationOrigin = getLocationOrigin();
    let hash = `${request.send}/${request.receive}/${request.sendStringAmount}/${orderId}`;

    // fees info
    if (composedInfo.composed) {
        hash += account.networkType === 'solana' ? '/normal' : '/custom'; // manually set fee type
        hash += `/${composedInfo.composed.feePerByte}`;
        hash += `/${composedInfo.composed.maxFeePerGas}`;
        hash += `/${composedInfo.composed.maxPriorityFeePerGas}`;

        if (composedInfo.composed.feeLimit) {
            hash += `/${composedInfo.composed.feeLimit}`;
        }
    }

    const params = `exchange-offers/${account.symbol}/${account.accountType}/${account.index}/${hash}`;

    if (isDesktop()) {
        const url = await desktopApi.getHttpReceiverAddress('/exchange-redirect');

        return `${url}?p=${encodeURIComponent(`/coinmarket-redirect/${params}`)}`;
    }

    return `${locationOrigin}${assetPrefix}/coinmarket-redirect#${params}`;
};
