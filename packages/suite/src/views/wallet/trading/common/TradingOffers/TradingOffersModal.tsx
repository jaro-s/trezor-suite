import { Translation } from '@suite/intl';
import { Modal } from '@trezor/components';

import { useTradingFormContext } from 'src/hooks/wallet/trading/form/useTradingCommonForm';
import { isTradingExchangeContext } from 'src/utils/wallet/trading/tradingTypingUtils';

import { TradingOffersModalExchange } from './TradingOffersModalExchange';
import { TradingOffersModalGroup } from './TradingOffersModalGroup';

type TradingOffersModalProps = {
    onClose: () => void;
};

export const TradingOffersModal = ({ onClose }: TradingOffersModalProps) => {
    const context = useTradingFormContext();

    const deduplicatedQuotes = context.quotes
        ? [...new Map(context.quotes.map(quote => [quote.exchange, quote])).values()]
        : [];

    return (
        <Modal
            onCancel={onClose}
            isBackdropCancelable
            heading={<Translation id="TR_TRADING_SHOW_OFFERS" />}
            data-testid="@trading/offers/modal"
            width={600}
            height={680}
        >
            {isTradingExchangeContext(context) ? (
                <TradingOffersModalExchange onSelectCallback={onClose} />
            ) : (
                <TradingOffersModalGroup quotes={deduplicatedQuotes} onSelectCallback={onClose} />
            )}
        </Modal>
    );
};
