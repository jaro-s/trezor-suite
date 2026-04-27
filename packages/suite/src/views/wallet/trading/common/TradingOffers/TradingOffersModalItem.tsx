import { useCallback } from 'react';

import { type BuyTrade, type ExchangeTrade, type SellFiatTrade } from 'invity-api';
import styled from 'styled-components';

import {
    type TradingTradeMapProps,
    type TradingTradeType,
    tradingBuyActions,
    tradingExchangeActions,
    tradingSellActions,
} from '@suite-common/trading';
import { CardList, Column, Row, SkeletonRectangle, Text } from '@trezor/components';
import { exhaustive } from '@trezor/type-utils';

import { useDispatch } from 'src/hooks/suite';
import { useTradingFormContext } from 'src/hooks/wallet/trading/form/useTradingCommonForm';
import {
    getCryptoQuoteAmountProps,
    getProvidersInfoProps,
    isTradingExchangeContext,
} from 'src/utils/wallet/trading/tradingTypingUtils';

import { useTradingOfferRate } from './useTradingOfferRate';
import { TradingUtilsKyc } from '../TradingUtils/TradingUtilsKyc';
import { TradingUtilsProvider } from '../TradingUtils/TradingUtilsProvider';

type TradingOffersModalItemProps = {
    quote: TradingTradeMapProps[keyof TradingTradeMapProps];
    onSelectCallback: () => void;
};

const ProviderWrapper = styled.div`
    display: grid;
    grid-template-columns: minmax(10rem, auto) auto;
    gap: 1rem;
    justify-content: center;
`;

export const TradingOffersModalItem = ({
    quote,
    onSelectCallback,
}: TradingOffersModalItemProps) => {
    const dispatch = useDispatch();
    const context = useTradingFormContext();
    const providers = getProvidersInfoProps(context);
    const {
        form: {
            state: { isFormLoading },
        },
    } = context;
    const cryptoAmountProps = getCryptoQuoteAmountProps(quote, context);
    const formattedRate = useTradingOfferRate(quote as TradingTradeType);
    const { exchange } = quote;
    const exchangeComparatorProps = isTradingExchangeContext(context)
        ? {
              isDex: (quote as ExchangeTrade).isDex,
              providers: context.exchangeInfo?.providerInfos,
          }
        : undefined;

    const onSelectQuote = useCallback(() => {
        switch (context.type) {
            case 'exchange':
                dispatch(tradingExchangeActions.savePreselectedQuote(quote as ExchangeTrade));
                onSelectCallback?.();
                break;
            case 'buy':
                dispatch(tradingBuyActions.savePreselectedQuote(quote as BuyTrade));
                onSelectCallback?.();
                break;
            case 'sell':
                dispatch(tradingSellActions.savePreselectedQuote(quote as SellFiatTrade));
                onSelectCallback?.();
                break;
            default:
                exhaustive(context);
        }
    }, [context, dispatch, onSelectCallback, quote]);

    if (!cryptoAmountProps) return null;

    return (
        <CardList.Item
            key={quote.id}
            onClick={onSelectQuote}
            data-testid="@trading/offers/quote"
            data-testid-alt={`@trading/offers/quote-${exchange}`}
            isDisabled={isFormLoading}
        >
            <Column gap={16} width="100%">
                <Row justifyContent="space-between" alignItems="center" width="100%">
                    <ProviderWrapper>
                        <TradingUtilsProvider providers={providers} exchange={exchange} />
                        {exchangeComparatorProps && (
                            <TradingUtilsKyc
                                exchange={exchange}
                                providers={exchangeComparatorProps.providers}
                                isForComparator
                                isDex={exchangeComparatorProps.isDex}
                            />
                        )}
                    </ProviderWrapper>

                    {isFormLoading && <SkeletonRectangle animate width={200} />}
                    {!isFormLoading && formattedRate && (
                        <Text typographyStyle="body-sm-strong">{formattedRate}</Text>
                    )}
                </Row>
            </Column>
        </CardList.Item>
    );
};
