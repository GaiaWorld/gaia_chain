
/**
 * test's entry
 */

import {mocha} from "../../framework/mocha"

import numberTest from "../util/number";

let tests = [numberTest];

export const runTest = () => {
    mocha.setup('bdd');
    for (let test of tests) {
        test();
    }
    mocha.run();
}