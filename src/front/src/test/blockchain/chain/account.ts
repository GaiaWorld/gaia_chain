declare const it, describe;

import { chai } from "../../framework/chai"
import { Account } from "../../../blockchain/chain/account"
import { BN } from "../../../blockchain/util/bn";
import DBTable from "../../../blockchain/chain/db"

import { BonBuffer } from "../../../pi/util/bon"
import { CDB, CSession } from "../../../pi/db/client"
import { Item } from "../../../pi/db/db"

export default () => {
    describe('chain/account', function () {
        describe('serde', function () {
            it('1', function () {
                let address = new BN("4bb0246cbfdfddbe605a374f1187204c896fabfd", 16, "le");
                let balance = new BN("40", 16, "le");
                let account = new Account(address, balance);

                let bb = new BonBuffer();
                account.bonEncode(bb);

                let newAccount = new Account();
                newAccount.bonDecode(bb);

                chai.assert.equal(newAccount.address.toString(16), account.address.toString(16));
                chai.assert.equal(newAccount.count.toString(16), account.count.toString(16));
                chai.assert.equal(newAccount.balance.toString(16), account.balance.toString(16));
            })
        })

        describe('db', function () {
            it('1', function () {

                let address = new BN("4bb0246cbfdfddbe605a374f1187204c896fabfd", 16, "le");
                let balance = new BN("40", 16, "le");
                let account = new Account(address, balance);

                let db = new CDB();
                let session = new CSession();
                session.open(db);

                session.write(tx => {

                    tx.alter(DBTable.ACCOUNT_TABLE, {});

                    let item = {
                        tab: DBTable.ACCOUNT_TABLE,
                        key: account.address.toString(16),
                        value: account,
                        time: 0
                    } as Item;

                    return tx.upsert([item], 10);
                }, 1);

                let newAccount = session.read(tx => {
                    let item = {
                        tab: DBTable.ACCOUNT_TABLE,
                        key: account.address.toString(16)
                    } as Item;
                    return tx.query([item], 10);
                }, 1);

                chai.assert.equal(Array.isArray(newAccount) && newAccount.length === 1, true);
                chai.assert.equal(newAccount !== account, true);

                newAccount = newAccount[0];
                chai.assert.equal(newAccount.address.toString(16), account.address.toString(16));
                chai.assert.equal(newAccount.count.toString(16), account.count.toString(16));
                chai.assert.equal(newAccount.balance.toString(16), account.balance.toString(16));
            })
        })
    })
}