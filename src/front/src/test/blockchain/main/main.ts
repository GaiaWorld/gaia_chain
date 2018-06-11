
/**
 * test's entry
 */

import {mocha} from "../../framework/mocha"

import util_bn from "../util/bn";
import util_buffer from "../util/buffer";
import util_crypto from "../util/crypto";

let tests = [util_bn, util_buffer, util_crypto];

export const runTest = () => {
    mocha.setup('bdd');
    for (let test of tests) {
        test();
    }
    mocha.run();
}