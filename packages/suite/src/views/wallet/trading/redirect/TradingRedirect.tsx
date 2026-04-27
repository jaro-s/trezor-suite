import { useEffect } from 'react';

import {
    type BuyCryptoPaymentMethod,
    type CryptoId,
    type SellCryptoPaymentMethod,
} from 'invity-api';
import styled from 'styled-components';

import { Translation } from '@suite/intl';
import { selectRouter } from '@suite/router';
import { updateFeeInfoThunk } from '@suite-common/wallet-core';
import { type FeeLevel } from '@trezor/connect';
import { typography } from '@trezor/theme';

import { useDispatch, useSelector } from 'src/hooks/suite';
import { useTradingRedirect } from 'src/hooks/wallet/useTradingRedirect';
import { type Account } from 'src/types/wallet';

const Wrapper = styled.div`
    display: flex;
    justify-content: center;
    align-items: center;
    flex: 1;
    ${typography['headline-sm']}
    height: 100%;
`;

export const TradingRedirect = () => {
    const {
        redirectToBuyOffers,
        redirectToBuyDetail,
        redirectToSellOffers,
        redirectToExchangeOffers,
    } = useTradingRedirect();
    const router = useSelector(selectRouter);

    const dispatch = useDispatch();

    useEffect(() => {
        // get rid of parameters appended by some partners to url which we pass to them
        const hashPart = router?.hash?.replace(/^#/, '').split('?')[0];
        const params = hashPart?.split('/');
        if (!params) return;
        const param = (i: number): string => {
            // @ts-expect-error: indexing with noUncheckedIndexedAccess
            const value: string = params[i];

            return value;
        };

        const redirectCommonParams = {
            routeType: param(0) as
                | 'detail'
                | 'offers'
                | 'sell-detail'
                | 'sell-offers'
                | 'exchange-offers',
            symbol: param(1) as Account['symbol'],
            accountType: param(2) as Account['accountType'],
            index: parseInt(param(3), 10),
        };

        dispatch(updateFeeInfoThunk({ networkSymbol: redirectCommonParams.symbol }));

        if (redirectCommonParams.routeType === 'offers') {
            redirectToBuyOffers({
                ...redirectCommonParams,
                wantCrypto: param(4) === 'qc',
                fiatCurrency: param(6),
                amount: param(7),
                receiveCurrency: param(8) as CryptoId,
                country: param(5),
                paymentMethod: param(9) as BuyCryptoPaymentMethod,
            });
        }

        if (redirectCommonParams.routeType === 'detail') {
            redirectToBuyDetail({ ...redirectCommonParams, transactionId: param(4) });
        }

        if (redirectCommonParams.routeType === 'sell-offers') {
            let feeIndex = 10;
            let orderId: string | undefined;
            if (param(4).startsWith('p-')) {
                feeIndex = 11;
                params[4] = param(4).substring(2);

                orderId = param(10);
            }
            redirectToSellOffers({
                ...redirectCommonParams,
                amountInCrypto: param(4) === 'qc',
                fiatCurrency: param(6),
                amount: param(7),
                cryptoCurrency: param(8) as CryptoId,
                country: param(5),
                paymentMethod: param(9) as SellCryptoPaymentMethod,
                orderId,
                selectedFee: param(feeIndex) as FeeLevel['label'],
                feePerByte: param(feeIndex + 1),
                maxFeePerGas: param(feeIndex + 2),
                maxPriorityFeePerGas: param(feeIndex + 3),
                feeLimit: param(feeIndex + 4),
            });
        }

        if (redirectCommonParams.routeType === 'exchange-offers') {
            const feeIndex = 8;
            redirectToExchangeOffers({
                ...redirectCommonParams,
                send: param(4) as CryptoId,
                receive: param(5) as CryptoId,
                amount: param(6),
                orderId: param(7),
                selectedFee: param(feeIndex) as FeeLevel['label'],
                feePerByte: param(feeIndex + 1),
                maxFeePerGas: param(feeIndex + 2),
                maxPriorityFeePerGas: param(feeIndex + 3),
                feeLimit: param(feeIndex + 4),
            });
        }
    }, [
        redirectToBuyOffers,
        redirectToBuyDetail,
        redirectToSellOffers,
        redirectToExchangeOffers,
        router,
        dispatch,
    ]);

    return (
        <Wrapper>
            <Translation id="TR_TRADE_REDIRECTING" />
        </Wrapper>
    );
};
