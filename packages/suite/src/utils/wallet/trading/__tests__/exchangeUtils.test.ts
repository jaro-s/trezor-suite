import { type CryptoId, type ExchangeTrade, type ExchangeTradeQuoteRequest } from 'invity-api';

import {
    TRADING_EXCHANGE_COMPARATOR_KYC_FILTER_ALL,
    TRADING_EXCHANGE_COMPARATOR_KYC_FILTER_NO_KYC,
    type TradingComposedTransactionInfo,
    type TradingExchangeInfoSelector,
} from '@suite-common/trading';
import { type Account } from '@suite-common/wallet-types';

import { KYC_DEX, KYC_NO_KYC, KYC_REQUIRED } from 'src/constants/wallet/trading/kyc';
import { createQuoteLink, groupExchangeQuotesByType } from 'src/utils/wallet/trading/exchangeUtils';

describe('exchangeUtils', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    const mockQuotesRequest: ExchangeTradeQuoteRequest = {
        send: 'bitcoin' as CryptoId,
        receive: 'litecoin' as CryptoId,
        sendStringAmount: '1',
    };
    const mockAccount = {
        symbol: 'btc',
        accountType: 'normal',
        index: 1,
    } as Account;
    const mockComposedInfo = {
        selectedFee: 'normal',
        composed: {
            feePerByte: '1',
            maxFeePerGas: '2',
            maxPriorityFeePerGas: '3',
            feeLimit: '4',
        },
    } as TradingComposedTransactionInfo;
    const mockQuoteId = 'quoteId';
    const createQuote = (quote: Partial<ExchangeTrade>): ExchangeTrade =>
        ({
            exchange: 'float-provider',
            orderId: 'order-id',
            ...(quote as ExchangeTrade),
        }) as ExchangeTrade;

    const mockExchangeInfo = {
        providerInfos: {
            'fixed-provider': {
                isFixedRate: true,
                kycPolicyType: KYC_NO_KYC,
            },
            'float-provider': {
                isFixedRate: false,
                kycPolicyType: KYC_REQUIRED,
            },
            'dex-provider': {
                isFixedRate: false,
                kycPolicyType: KYC_DEX,
            },
            'no-kyc-float-provider': {
                isFixedRate: false,
                kycPolicyType: KYC_NO_KYC,
            },
        },
    } as unknown as TradingExchangeInfoSelector;

    describe('groupExchangeQuotesByType', () => {
        it('should group quotes into fixed, float and dex buckets', () => {
            const fixedQuote = createQuote({
                exchange: 'fixed-provider',
                orderId: 'fixed-order-id',
            });
            const floatQuote = createQuote({
                exchange: 'float-provider',
                orderId: 'float-order-id',
            });
            const dexQuote = createQuote({
                exchange: 'dex-provider',
                isDex: true,
                orderId: 'dex-order-id',
            });

            expect(
                groupExchangeQuotesByType({
                    quotes: [fixedQuote, floatQuote, dexQuote],
                    exchangeInfo: mockExchangeInfo,
                    kycFilter: TRADING_EXCHANGE_COMPARATOR_KYC_FILTER_ALL,
                }),
            ).toStrictEqual({
                fixed: [fixedQuote],
                float: [floatQuote],
                dex: [dexQuote],
            });
        });

        it('should keep only NO_KYC and DEX quotes when NO_KYC filter is selected', () => {
            const filteredOutQuote = createQuote({
                exchange: 'float-provider',
                orderId: 'filtered-out-order-id',
            });
            const noKycQuote = createQuote({
                exchange: 'no-kyc-float-provider',
                orderId: 'no-kyc-order-id',
            });
            const dexQuote = createQuote({
                exchange: 'dex-provider',
                isDex: true,
                orderId: 'dex-order-id',
            });

            expect(
                groupExchangeQuotesByType({
                    quotes: [filteredOutQuote, noKycQuote, dexQuote],
                    exchangeInfo: mockExchangeInfo,
                    kycFilter: TRADING_EXCHANGE_COMPARATOR_KYC_FILTER_NO_KYC,
                }),
            ).toStrictEqual({
                fixed: [],
                float: [noKycQuote],
                dex: [dexQuote],
            });
        });

        it('should return empty groups when quotes are undefined', () => {
            expect(
                groupExchangeQuotesByType({
                    quotes: undefined,
                    exchangeInfo: mockExchangeInfo,
                    kycFilter: TRADING_EXCHANGE_COMPARATOR_KYC_FILTER_ALL,
                }),
            ).toStrictEqual({
                fixed: [],
                float: [],
                dex: [],
            });
        });
    });

    describe('createQuoteLink', () => {
        it('should create link for quote', async () => {
            expect(
                await createQuoteLink(
                    mockQuotesRequest,
                    mockAccount,
                    mockComposedInfo,
                    mockQuoteId,
                ),
            ).toStrictEqual(
                `${window.location.origin}/coinmarket-redirect#exchange-offers/btc/normal/1/bitcoin/litecoin/1/quoteId/custom/1/2/3/4`,
            );
        });

        it('should create link for quote when selectedFee is high', async () => {
            expect(
                await createQuoteLink(
                    mockQuotesRequest,
                    mockAccount,
                    { ...mockComposedInfo, selectedFee: 'high' },
                    mockQuoteId,
                ),
            ).toStrictEqual(
                `${window.location.origin}/coinmarket-redirect#exchange-offers/btc/normal/1/bitcoin/litecoin/1/quoteId/custom/1/2/3/4`,
            );
        });

        it('should create link for quote when selectedFee is custom', async () => {
            expect(
                await createQuoteLink(
                    mockQuotesRequest,
                    mockAccount,
                    { ...mockComposedInfo, selectedFee: 'custom' },
                    mockQuoteId,
                ),
            ).toStrictEqual(
                `${window.location.origin}/coinmarket-redirect#exchange-offers/btc/normal/1/bitcoin/litecoin/1/quoteId/custom/1/2/3/4`,
            );
        });

        it('should create link for quote when account network type is solana', async () => {
            expect(
                await createQuoteLink(
                    mockQuotesRequest,
                    {
                        ...mockAccount,
                        symbol: 'sol',
                        networkType: 'solana',
                    } as Account,
                    { ...mockComposedInfo, selectedFee: 'normal' },
                    mockQuoteId,
                ),
            ).toStrictEqual(
                `${window.location.origin}/coinmarket-redirect#exchange-offers/sol/normal/1/bitcoin/litecoin/1/quoteId/normal/1/2/3/4`,
            );
        });
    });
});
