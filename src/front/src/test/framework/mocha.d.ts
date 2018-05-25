
declare class Mocha {
    
    setup(str: string);
    
    run();
}

export const mocha: Mocha;

declare interface Func {
    (str: string, func: ()=>void);
}

export declare const it: Func;

export const describe: Func;