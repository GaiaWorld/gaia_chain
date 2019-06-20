/**
 * TODO:因为链接可能会很多，需要对链接进行管理，包括链接的上限，何时断开等
 */
// ========================================================  export

export class ConnMgr{
    
}

/**
 * 获取一个新的Nonce
 */
export const getNextConnNonce = ():number => {
    return ++connNonce;
}

let connNonce = 0; 