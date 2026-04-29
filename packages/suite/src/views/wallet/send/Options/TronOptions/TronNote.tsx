import { useEffect } from 'react';

import { Translation, useTranslation } from '@suite/intl';
import { formInputsMaxLength } from '@suite-common/validators';
import { Card, Column, H4, IconButton, Row, Textarea } from '@trezor/components';

import { useSendFormContext } from 'src/hooks/wallet';

const inputAsciiName = 'tronDataAscii';
const inputHexName = 'transactionData';

type TronNoteProps = {
    close: () => void;
};

export const TronNote = ({ close }: TronNoteProps) => {
    const { register, watch, setValue, composeTransaction, resetDefaultValue } =
        useSendFormContext();

    const { translationString } = useTranslation();

    const asciiValue = watch(inputAsciiName);
    const hexValue = watch(inputHexName);

    const isHexTooLong = !hexValue ? false : hexValue.length > formInputsMaxLength.tronNote;
    const error = isHexTooLong ? translationString('TR_TRON_NOTE_TOO_LONG') : undefined;

    useEffect(() => {
        setValue(inputHexName, Buffer.from(asciiValue || '', 'utf8').toString('hex'));
    }, [asciiValue, setValue]);

    useEffect(() => {
        composeTransaction(inputHexName);
    }, [hexValue, composeTransaction]);

    const handleClose = () => {
        resetDefaultValue(inputAsciiName);
        close();
    };

    const { ref: inputRef, ...inputField } = register(inputAsciiName);

    return (
        <Card>
            <Column gap={12}>
                <Row justifyContent="space-between">
                    <H4 typographyStyle="body-md">
                        <Translation id="TR_TRON_NOTE" />
                    </H4>

                    <IconButton
                        intent="neutral"
                        priority="secondary"
                        icon="x"
                        size="small"
                        onClick={handleClose}
                    />
                </Row>

                <Textarea
                    hasError={isHexTooLong}
                    bottomText={error}
                    defaultValue={asciiValue}
                    innerRef={inputRef}
                    rows={3}
                    characterCount={{
                        current: hexValue?.length,
                        max: formInputsMaxLength.tronNote,
                    }}
                    {...inputField}
                />
            </Column>
        </Card>
    );
};
