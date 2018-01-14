const EventEmitter = require("events");
const Block = require("./block");
const Transaction = require("./transaction");

const REPLACED = "blockchainReplaced";

class Chain extends EventEmitter {
    constructor(blocksDB, transactionsDB) {
        super();

        this.b = blocksDB;
        this.t = transactionsDB;

        this.b
            .size()
            .then(length => (length === 0 ? this.b.put(0, Block.genesis) : undefined))
            .then(() => this.unqueueConfirmed());
    }

    unqueueConfirmed() {
        const that = this;
        return this
            .t
            .ids()
            .then(ids => ids.map(id => that.isConfirmed(that.t.get(id))
                .then(confirmed => (confirmed ? that.t.remove(id) : null))));
    }

    isConfirmed(transaction) {
        const that = this;
        return this.b
            .ids()
            .then((ids) => {
                const crawl = () => {
                    const id = ids.shift();
                    if (!id) {
                        return false;
                    }
                    return that.b
                        .get(id)
                        .then(Block.load)
                        .then(block => block.has(transaction))
                        .then(hasTransaction => (hasTransaction ? true : crawl()));
                };

                return crawl();
            });
    }

    findSharedParent(newBlockchain) {
        const chain = [...newBlockchain];
        const that = this;

        if (JSON.stringify(chain[0]) !== JSON.stringify(Block.genesis)) {
            console.error("Genesis blocks aren't the same");
            return Promise.resolve(false);
        }

        let index = 1;
        newBlockchain.shift();
        let lastShared = Block.genesis;

        const crawl = () => {
            const block = newBlockchain.shift();
            index += 1;
            if (block.index !== index) {
                console.error("Block has invalid index", block, index);
                return Promise.resolve(false);
            }
            return that.b
                .get(index)
                .then((myBlock) => {
                    if (!myBlock) {
                        return lastShared;
                    }
                    if (JSON.stringify(chain[0]) !== JSON.stringify(myBlock)) {
                        return lastShared;
                    }
                    lastShared = myBlock;
                    return crawl();
                });
        };

        return crawl();
    }

    replaceChain(newBlockchain) {
        const that = this;
        return this.b
            .size()
            .then((currentSize) => {
                // It doesn't make sense to replace this blockchain by a smaller one
                if (newBlockchain.length <= currentSize) {
                    return false;
                }

                const amount = newBlockchain.length - currentSize;
                // const sharedParent = currentSize

                const newBlocks = newBlockchain.slice(currentSize - 1, amount);

                // return that.b.get(newBlocks

                // Verify if the new blockchain is correct
                return that
                    .checkChain(newBlockchain)
                    .then((isOk) => {
                        if (!isOk) {
                            return false;
                        }

                        return Promise
                            .all(newBlocks
                                .map(block => that
                                    .addBlock(block, false)))
                            .then(() => that.emitter.emit(REPLACED, newBlocks));
                    });
            });
    }

    checkChain(blockchainToValidate) {
        const that = this;

        if (JSON.stringify(blockchainToValidate[0]) !== JSON.stringify(Block.genesis)) {
            console.error("Genesis blocks aren't the same");
            return false;
        }

        try {
            const chain = blockchainToValidate.map(Block.load);

            const crawl = () => {
                const block = chain.shift();

                if (!crawl) {
                    return true;
                }

                return that
                    .checkBlock(block, chain[chain.length - 1])
                    .then(valid => (!valid ? false : crawl()));
            };

            return crawl();
        } catch (exception) {
            return Promise.reject(exception);
        }
    }

    checkBlock(newBlock, previousBlock) {
        const blockHash = newBlock.toHash();
        const that = this;

        if (previousBlock.index + 1 !== newBlock.index) { // Check if the block is the last one
            console.error(`Invalid index: expected '${previousBlock.index + 1}' got '${newBlock.index}'`);
            return Promise.resolve(false);
        } else if (previousBlock.hash !== newBlock.parent) { // Check if the previous block is correct
            console.error(`Invalid previoushash: expected '${previousBlock.hash}' got '${newBlock.parent}'`);
            return Promise.resolve(false);
        } else if (blockHash !== newBlock.hash) { // Check if the hash is correct
            console.error(`Invalid hash: expected '${blockHash}' got '${newBlock.hash}'`);
            return Promise.resolve(false);
        } else if (!Block.validProof(Block.checkPOW, previousBlock.pow, newBlock.pow, newBlock.hash, newBlock.timestamp)) {
            console.error("Invalid proof-of-work");
            return Promise.resolve(false);
        }

        // For each transaction in this block, check if it is valid
        try {
            newBlock
                .transactions
                .forEach(transaction => that.checkTransaction(transaction));
        } catch (exception) {
            console.error(exception);
            return Promise.resolve(false);
        }

        // Check if the sum of output transactions are equal the sum of input transactions + MINING_REWARD (representing the reward for the block miner)
        const sumOfInputsAmount = newBlock.getInBalance() + newBlock.getRewards();
        const sumOfOutputsAmount = newBlock.getInBalance() + newBlock.getRewards();

        const isInputsAmountGreaterOrEqualThanOutputsAmount = sumOfInputsAmount >= sumOfOutputsAmount;

        if (!isInputsAmountGreaterOrEqualThanOutputsAmount) {
            console.error(`Invalid block balance: inputs sum '${sumOfInputsAmount}', outputs sum '${sumOfOutputsAmount}'`);
            throw new Error(`Invalid block balance: inputs sum '${sumOfInputsAmount}', outputs sum '${sumOfOutputsAmount}'`, { sumOfInputsAmount, sumOfOutputsAmount });
        }

        // Check if there is only 1 fee transaction and 1 reward transaction;
        const transactionsByType = newBlock
            .transactions
            .map(transaction => transaction.type)
            .reduce((p, c) => {
                const z = p;
                z[c] = (p[c] || 0) + 1;
                return z;
            }, {});

        if (
            !(transactionsByType[Transaction.REWARD] === 1 && transactionsByType[Transaction.INTEREST] === 0)
            &&
            !(transactionsByType[Transaction.REWARD] === 0 && transactionsByType[Transaction.INTEREST] === 1)
        ) {
            console.error(`Invalid reward/interest transaction count: got '${transactionsByType[Transaction.REWARD]}' rewards and '${transactionsByType[Transaction.INTEREST]}' interests `);
            return Promise.resolve(false);
        }

        return Promise.resolve(true);
    }

    addBlock(newBlock, emit = true) {
        // It only adds the block if it's valid (we need to compare to the previous one)
        if (this.checkBlock(newBlock, this.getLastBlock())) {
            this.blocks.push(newBlock);
            this.blocksDb.write(this.blocks);

            // After adding the block it removes the transactions of this block from the list of pending transactions
            this.removeBlockTransactionsFromTransactions(newBlock);

            console.info(`Block added: ${newBlock.hash}`);
            console.debug(`Block added: ${JSON.stringify(newBlock)}`);
            if (emit) this.emitter.emit("blockAdded", newBlock);

            return newBlock;
        }
        return null;
    }
}

module.exports = Chain;
module.exports.REPLACED = REPLACED;
