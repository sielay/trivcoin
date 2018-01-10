const crypto = require("crypto");
const Transaction = require("./transaction");
const x11 = require("x11-hash-js");

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

    static validProof(checker, previousProof, pow, hash, timestamp) {
        const h = x11.digest(previousProof + "" + pow + hash + timestamp);
        return checker(h, pow);
    }

    constructor(parent, transactions) {
        this.index = parent ? parent.index : 0;
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
                transactions: this.transactions.map(t => t.toJSON)
            }))
            .digest("base64");
    }

    validProof(previousProof, checker) {
        return Block.validProof(checker, previousProof, this.pow, this.hash, this.timestamp);
    }

    mine(previousProof, checker, genesis) {
        const start = Date.now();
        let found = false;
        do {
            if (!genesis) {
                this.timestamp = Math.round(new Date().getTime() / 1000);
            } else {
                // process.stdout.("\r" + this.pow);
            }
            this.pow++;
            this.hash = this.toHash();
            // process.stdout.write("\r" + this.pow);
            found = this.validProof(previousProof, checker);
        } while (found !== true);
        // console.log("mining time " + Math.round((Date.now() - start) / 1000) + "s");
    }

    has(transaction) {
        for (let t of this.transactions) {
            if (t.id === transaction.id && t.hash === transaction.hash) {
                return true;
            }
        }
        return false;
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
            transactions: this.transactions.map(t => t.toJSON),
            hash: this.toHash()
        }
    }

    getInBalance() {
        return this
            .transactions
            .map(transation => transaction.getInBalance())
            .reduce((p, c) => p + c, 0);
    }

    getOutBalance() {
        return this
            .transactions
            .map(transation => transaction.getOutBalance())
            .reduce((p, c) => p + c, 0);
    }

    getRewards() {
        return this
            .transactions
            .filter(transaction => [Transaction.REWARD, Transation.INTEREST].indexOf(transactions.type) !== -1)
            .map(transation => transaction.getOutBalance())
            .reduce((p, c) => p + c, 0);
    }
}

module.exports = Block;

module.exports.genesis = Block.load({
    index: 0,
    parent: "0",
    pow: 262048,
    timestamp: 1465900260,
    transactions: [],
    hash: "blyAmtm8HW9u5eqPKGTZyAeRP6GtBT7d5sBg5i4bpB8="
});

module.exports.checkPOW = (hash, pow, parent) => {
    const find = parent[0] + parent[0] + parent[0] + parent[0];
    const sub = hash.substr(0, find.length)
    // process.stdout.write(" " + sub + " " + sub.length + " " + pow + " " + (pow % 2));
    if (sub === find) {
        // process.stdout.write(" almost\n\r\n");
    }
    return (sub === find) && (pow % 2 === 0);
}

