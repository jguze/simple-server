export function splitQueryParamPart(path: string): { path: string, qsp?: string } {
    const qspIndex = path.indexOf('?');
    if (qspIndex === -1) {
        return {
            path,
        };
    }

    return {
        path: path.substr(0, qspIndex),
        qsp: path.substr(qspIndex + 1, path.length),
    };
}