import { Translation, type TranslationKey } from '@suite/intl';
import { type TradingTradeMapProps } from '@suite-common/trading';
import { CardList, Column, H3, Paragraph } from '@trezor/components';

import { TradingOffersModalItem } from './TradingOffersModalItem';

type TradingOffersModalGroupProps = {
    title?: TranslationKey;
    description?: TranslationKey;
    quotes: TradingTradeMapProps[keyof TradingTradeMapProps][];
    onSelectCallback: () => void;
};
export const TradingOffersModalGroup = ({
    title,
    description,
    quotes,
    onSelectCallback,
}: TradingOffersModalGroupProps) => (
    <Column gap={16}>
        <div>
            {title && (
                <H3 typographyStyle="body-md-strong">
                    <Translation id={title} />
                </H3>
            )}
            {description && (
                <Paragraph typographyStyle="body-sm" color="contentSecondary">
                    <Translation id={description} />
                </Paragraph>
            )}
        </div>
        <CardList>
            {quotes.map(quote => (
                <TradingOffersModalItem
                    key={quote.id!}
                    quote={quote}
                    onSelectCallback={onSelectCallback}
                />
            ))}
        </CardList>
    </Column>
);
