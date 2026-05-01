import dump from '../../fixtures/remembered-wallet-db.json';
import { expect, test } from '../../support/fixtures';

test.describe('Trading - remembered wallet loading', { tag: ['@noDevice'] }, () => {
    test.use({
        startEmulator: false,
        setupEmulator: false,
        useTrezorUserEnv: false,
        electronConf: { keepUserData: true, bridgeDaemon: true },
        viewport: { width: 1440, height: 900 },
    });

    test('Load remembered wallet and open trading forms without connected device', async ({
        page,
        indexedDb,
        walletPage,
        tradingPage,
    }) => {
        await test.step('Wait for Suite to initialize IndexedDB schema', async () => {
            await indexedDb.waitForInit();
        });

        await test.step('Seed remembered wallet from real DB dump', async () => {
            await indexedDb.seedFromDump(dump as Record<string, unknown[]>);
        });

        await test.step('Reload Suite with remembered state', async () => {
            await page.reload();
            await expect(page.getByTestId('@suite/loading')).toBeVisible({ timeout: 10_000 });
            await expect(page.getByTestId('@suite/loading')).toBeHidden({ timeout: 30_000 });
        });

        await test.step('Open buy and swap forms from remembered wallet', async () => {
            await expect(walletPage.accountButton({ symbol: 'btc' })).toBeVisible({
                timeout: 30_000,
            });
            await expect(walletPage.deviceDisconnectedStatus).toBeVisible({ timeout: 30_000 });

            await walletPage.openTrading({ symbol: 'btc' });
            await tradingPage.verifyBuyFormOpened(/Bitcoin/);

            await walletPage.openSwapTrading({ symbol: 'btc' });
            await tradingPage.verifySwapFormOpened(/Bitcoin/);
        });
    });
});
