export const assert = (expr: boolean): void => {
    if (!expr) {
        throw new Error('Assert failed');
    }
};

export const unreachable = (): void => {
    throw new Error('Unreachable statements');
};