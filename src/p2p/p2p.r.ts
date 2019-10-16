/**
 * rpcs
 */

// #[rpc=rpcServer]
export const handShake = (): void => {
    // determine how to sync with peers
    return;
};

// #[rpc=rpcServer]
export const onReceivePing = (): void => {
    // send pong, if we need it ???
    return;
};

// #[rpc=rpcServer]
export const onReceiveBlockHash = (): void => {
    return;
};

// #[rpc=rpcServer]
export const onReceiveTxHash = (): void => {
    // if local node does not exsit, fetch and put it to tx pool
    return;
};

// #[rpc=rpcServer]
export const onReceiveHeader = (): void => {
    return;
};

// reaction to peer best chain changed
// #[rpc=rpcServer]
export const onPeerBestChainChanged = (): void => {
    return;
};

// #[rpc=rpcServer]
export const getTransaction = (txHash: string): void => {
    return;
};

// #[rpc=rpcServer]
export const getBlock = (): void => {
    return;
};

// #[rpc=rpcServer]
export const getHeader = (): void => {
    return;
};
