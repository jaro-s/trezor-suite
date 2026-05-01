import type { Page } from '@playwright/test';

export class IndexedDbFixture {
    constructor(private page: Page) {}

    async reset() {
        await this.page.evaluate(
            () =>
                new Promise<void>((resolve, reject) => {
                    const request = indexedDB.deleteDatabase('trezor-suite');

                    request.onsuccess = () => {
                        resolve();
                    };

                    request.onerror = () => {
                        reject(request.error);
                    };
                }),
        );
    }

    async waitForInit(timeout = 30_000) {
        const startTime = Date.now();

        while (Date.now() - startTime < timeout) {
            const hasStores = await this.page.evaluate(
                () =>
                    new Promise<boolean>(resolve => {
                        const request = indexedDB.open('trezor-suite');

                        request.onsuccess = () => {
                            const db = request.result;
                            const ready = db.objectStoreNames.length > 0;
                            db.close();
                            resolve(ready);
                        };

                        request.onerror = () => resolve(false);
                    }),
            );

            if (hasStores) return;

            await new Promise(resolve => setTimeout(resolve, 200));
        }

        throw new Error('IndexedDB schema was not initialized within timeout');
    }

    /**
     * Seeds all IndexedDB stores from a raw dump produced by the browser export script.
     * Clears existing data first, then handles key inference for stores that don't embed keys in their values.
     *
     * Expected dump shape: `{ accounts, txs, graph, devices, suiteSettings, walletSettings, analytics }`
     *
     * ## How to create the dump
     *
     * 1. Open Suite in the browser (e.g. http://localhost:8000) with the wallet state you want to capture.
     * 2. Open DevTools → Console and run the following script:
     *
     * ```js
     * (async () => {
     *     const db = await new Promise((resolve, reject) => {
     *         const req = indexedDB.open('trezor-suite');
     *         req.onsuccess = () => resolve(req.result);
     *         req.onerror = () => reject(req.error);
     *     });
     *
     *     const stores = [...db.objectStoreNames];
     *     const result = {};
     *
     *     for (const storeName of stores) {
     *         const tx = db.transaction(storeName, 'readonly');
     *         const store = tx.objectStore(storeName);
     *         result[storeName] = await new Promise((resolve, reject) => {
     *             const req = store.getAll();
     *             req.onsuccess = () => resolve(req.result);
     *             req.onerror = () => reject(req.error);
     *         });
     *     }
     *
     *     const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' });
     *     const url = URL.createObjectURL(blob);
     *     const a = document.createElement('a');
     *     a.href = url;
     *     a.download = 'trezor-suite-db.json';
     *     a.click();
     *     URL.revokeObjectURL(url);
     *     console.log('Exported stores:', stores);
     * })();
     * ```
     *
     * 3. Save the downloaded `trezor-suite-db.json` to `suite/e2e/fixtures/`.
     * 4. Import and pass it to `seedFromDump()` in your test.
     */
    async seedFromDump(dump: Record<string, unknown[]>) {
        await this.page.evaluate(
            (dumpData: Record<string, unknown[]>) =>
                new Promise<void>((resolve, reject) => {
                    const request = indexedDB.open('trezor-suite');

                    request.onsuccess = () => {
                        const db = request.result;
                        const storeNames = Array.from(db.objectStoreNames);
                        const tx = db.transaction(storeNames, 'readwrite');

                        tx.oncomplete = () => {
                            db.close();
                            resolve();
                        };

                        tx.onerror = () => {
                            db.close();
                            reject(tx.error);
                        };

                        storeNames.forEach(storeName => {
                            tx.objectStore(storeName).clear();
                        });

                        // Stores where the key is embedded via keyPath — just put the value
                        const keyPathStores = ['accounts', 'txs', 'graph'];

                        keyPathStores.forEach(storeName => {
                            if (!storeNames.includes(storeName)) return;
                            const entries = (dumpData[storeName] as unknown[]) ?? [];
                            const store = tx.objectStore(storeName);
                            entries.forEach(entry => store.put(entry));
                        });

                        // Devices store — key is state.staticSessionId (not in keyPath)
                        if (storeNames.includes('devices')) {
                            const store = tx.objectStore('devices');
                            const devices =
                                (dumpData['devices'] as Record<string, unknown>[] | undefined) ??
                                [];
                            devices.forEach(device => {
                                const state = device['state'] as
                                    | Record<string, unknown>
                                    | undefined;
                                const key = state?.['staticSessionId'] as string | undefined;

                                if (key) {
                                    store.put(device, key);
                                }
                            });
                        }

                        // Single-entry key-value stores — fixed keys, first element wins
                        const fixedKeyStores: Record<string, string> = {
                            suiteSettings: 'suite',
                            walletSettings: 'wallet',
                            analytics: 'suite',
                        };

                        Object.entries(fixedKeyStores).forEach(([storeName, key]) => {
                            if (!storeNames.includes(storeName)) return;
                            const entries = (dumpData[storeName] as unknown[]) ?? [];

                            if (entries.length > 0) {
                                tx.objectStore(storeName).put(entries[0], key);
                            }
                        });
                    };

                    request.onerror = () => reject(request.error);
                }),
            dump,
        );
    }
}
