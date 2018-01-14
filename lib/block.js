const crypto = require("crypto");
const Transaction = require("./transaction");
const x11 = require("x11-hash-js");
const timestamp = require("./timestamp");

const BLOCK_TRANSACTION_MAX = 100;
const BLOCK_SIZE_MAX = 1000000;

class Block {
    static load(json) {
        const block = new Block(null, json.transactions.map(t => Transaction.load(t)));
        block.pow = json.pow;
        block.index = json.index;
        block.hash = json.hash;
        block.timestamp = json.timestamp;
        return block;
    }

    static validProof(checker, previousProof, pow, hash, ts) {
        const h = x11.digest(`${previousProof}${pow}${hash}${ts}`);
        return checker(h, pow, previousProof);
    }

    constructor(parent, transactions) {
        this.index = parent ? (parent.index + 1) : 0;
        this.parent = parent ? parent.hash : "0";
        this.pow = 0;
        this.transactions = transactions;
    }

    toHash() {
        return crypto
            .createHmac("sha256", this.index.toFixed(0)).update(JSON.stringify({
                index: this.index,
                parent: this.parent,
                timestamp: this.timestamp,
                pow: this.pow,
                transactions: this.transactions.map(t => t.toJSON),
            }))
            .digest("base64");
    }

    validProof(previousProof, checker) {
        return Block.validProof(checker, previousProof, this.pow, this.hash, this.timestamp);
    }

    mine(previousProof, checker, genesis) {
        // const start = Date.now();
        let found = false;
        do {
            if (!genesis) {
                this.timestamp = timestamp();
            } else {
                // process.stdout.write("\r" + this.pow);
            }
            this.pow += 1;
            this.hash = this.toHash();
            // process.stdout.write("\r" + this.pow);
            // process.stdout.write("\r " + Math.round((Date.now() - start) / 1000) + "s");
            found = this.validProof(previousProof, checker);
        } while (found !== true);
        // console.log("mining time " + Math.round((Date.now() - start) / 1000) + "s");
    }

    has(transaction) {
        let has = false;
        this
            .transactions
            .some((t) => {
                if (t.id === transaction.id && t.hash === transaction.hash) {
                    has = true;
                    return true;
                }
                return false;
            });
        return has;
    }

    validContent() {
        if (this.transactions.length > BLOCK_TRANSACTION_MAX) {
            return false;
        }
        if (JSON.stringify(this.toJSON()).length > BLOCK_SIZE_MAX) {
            return false;
        }
        return true;
    }

    toJSON() {
        return { // Block
            index: this.index,
            parent: this.parent,
            timestamp: this.timestamp,
            pow: this.pow,
            transactions: this.transactions.map(t => t.toJSON()),
            hash: this.toHash(),
        };
    }

    getInBalance() {
        return this
            .transactions
            .map(transaction => transaction.getInBalance())
            .reduce((p, c) => p + c, 0);
    }

    getOutBalance() {
        return this
            .transactions
            .map(transaction => transaction.getOutBalance())
            .reduce((p, c) => p + c, 0);
    }

    getRewards() {
        return this
            .transactions
            .filter(transaction => [Transaction.REWARD, Transaction.INTEREST]
                .indexOf(transaction.type) !== -1)
            .map(transaction => transaction.getOutBalance())
            .reduce((p, c) => p + c, 0);
    }
}

module.exports = Block;

module.exports.genesis = Block.load({
    index: 0,
    parent: "0",
    timestamp: 1465900260,
    pow: 149957,
    transactions: [],
    hash: "GNyvMUzLQzb/x1ZsB6I+BKnwIxo6KTG6hCzEjID/qE8=",
});

const stats = {};

module.exports.checkPOW = (hash, pow, parent) => {
    const char = String(parent)[0];
    const find = char + char + char + char;

    // console.log(find);
    const sub = hash.substr(0, 4);


    if (pow % 2 && sub[0] === sub[1] && sub[1] === sub[2] && sub[1] === sub[3]) {
        stats[sub] = (stats[sub] || 0) + 1;
    }

    // process.stdout.write(" " + find + " " + pow + " " + hash + " " + (pow % 2) + " ");

    // Object.keys(stats).forEach(k => {
    // process.stdout.write(" " + k + "=" + stats[k]);
    // });

    // process.stdout.write("\r " + sub + " " + sub.length + " " + pow + " " + (pow % 2));
    // if (sub === find) {
    // process.stdout.write(" almost\n\r\n");
    // }
    return (sub === find) && (pow % 2 === 0);
};

