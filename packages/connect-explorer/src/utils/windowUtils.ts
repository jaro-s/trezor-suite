export const getQueryVariable = (variable: string) => {
    const query = window.location.hash.substring(3);
    const vars = query.split('&');
    for (let i = 0; i < vars.length; i++) {
        const varEntry = vars[i] ?? '';
        const pair = varEntry.split('=');
        const key = pair[0] ?? '';
        const val = pair[1] ?? '';
        if (decodeURIComponent(key) === variable) {
            return decodeURIComponent(val);
        }
    }
};
