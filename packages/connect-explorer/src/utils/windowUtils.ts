export const getQueryVariable = (variable: string) => {
    const query = window.location.hash.substring(3);
    const vars = query.split('&');
    for (let i = 0; i < vars.length; i++) {
        // @ts-expect-error: indexing with noUncheckedIndexedAccess
        const entry: string = vars[i];
        const pair = entry.split('=');
        if (decodeURIComponent(pair[0] ?? '') === variable) {
            return decodeURIComponent(pair[1] ?? '');
        }
    }
};
