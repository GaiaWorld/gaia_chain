
/**
 * test's entry
 */

import {mocha} from "../../framework/mocha"

import number from "../util/number";
import ethereumjs_util from "../util/ethereumjs_util";

let tests = [number, ethereumjs_util];

export const runTest = () => {
    mocha.setup('bdd');
    for (let test of tests) {
        test();
    }
    mocha.run();
}