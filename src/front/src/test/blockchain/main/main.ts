
/**
 * test's entry
 */

import { mocha } from "../../framework/mocha"

import util_bn from "../util/bn";
import util_buffer from "../util/buffer";
import util_crypto from "../util/crypto";

import chain_account from "../chain/account";
import chain_block from "../chain/block";
import chain_forge from "../chain/forge";
import chain_header from "../chain/header";
import chain_transaction from "../chain/transaction";

let tests = [
    util_bn, util_buffer, util_crypto,

    chain_account, chain_block,
    chain_forge, chain_header, chain_transaction,
];

export const runTest = () => {
    mocha.setup('bdd');
    for (let test of tests) {
        test();
    }
    mocha.run();
}