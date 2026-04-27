import { useState } from 'react';

import { Translation } from '@suite/intl';
import {
    TRADING_EXCHANGE_COMPARATOR_KYC_FILTER_ALL,
    type TradingExchangeType,
} from '@suite-common/trading';
import { Column, SubTabs } from '@trezor/components';

import { useTradingFormContext } from 'src/hooks/wallet/trading/form/useTradingCommonForm';
import { groupExchangeQuotesByType } from 'src/utils/wallet/trading/exchangeUtils';

import { TradingOffersModalGroup } from './TradingOffersModalGroup';

type ExchangeTab = 'all' | 'cex' | 'dex';

type TradingOffersModalExchangeProps = {
    onSelectCallback: () => void;
};
export const TradingOffersModalExchange = ({
    onSelectCallback,
}: TradingOffersModalExchangeProps) => {
    const context = useTradingFormContext<TradingExchangeType>();
    const [activeTab, setActiveTab] = useState<ExchangeTab>('all');

    const { fixed, float, dex } = groupExchangeQuotesByType({
        quotes: context.quotes,
        exchangeInfo: context.exchangeInfo,
        kycFilter: TRADING_EXCHANGE_COMPARATOR_KYC_FILTER_ALL,
    });

    const showDex = activeTab === 'all' || activeTab === 'dex';
    const showCex = activeTab === 'all' || activeTab === 'cex';

    return (
        <Column gap={24}>
            <SubTabs activeItemId={activeTab}>
                <SubTabs.Item id="all" onClick={() => setActiveTab('all')}>
                    <Translation id="TR_ALL" />
                </SubTabs.Item>
                <SubTabs.Item id="cex" onClick={() => setActiveTab('cex')}>
                    <Translation id="TR_EXCHANGE_CEX" />
                </SubTabs.Item>
                <SubTabs.Item id="dex" onClick={() => setActiveTab('dex')}>
                    <Translation id="TR_EXCHANGE_DEX" />
                </SubTabs.Item>
            </SubTabs>
            {showDex && dex.length > 0 && (
                <TradingOffersModalGroup
                    title="TR_TRADING_EXCHANGE_DEX_OFFERS_HEADING"
                    description="TR_TRADING_EXCHANGE_DEX_OFFERS_HEADING_TOOLTIP"
                    quotes={dex}
                    onSelectCallback={onSelectCallback}
                />
            )}
            {showCex && float.length > 0 && (
                <TradingOffersModalGroup
                    title="TR_TRADING_EXCHANGE_FLOAT_OFFERS_HEADING"
                    description="TR_TRADING_FLOATING_RATE_DESCRIPTION"
                    quotes={float}
                    onSelectCallback={onSelectCallback}
                />
            )}
            {showCex && fixed.length > 0 && (
                <TradingOffersModalGroup
                    title="TR_TRADING_EXCHANGE_FIXED_OFFERS_HEADING"
                    description="TR_TRADING_FIX_RATE_DESCRIPTION"
                    quotes={fixed}
                    onSelectCallback={onSelectCallback}
                />
            )}
        </Column>
    );
};
