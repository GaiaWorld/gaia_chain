
declare class Assert {
    equal(a: any, b: any);
    deepEqual(a: any, b: any);
}

declare class Chai {
    assert: Assert;
}

export const chai: Chai;