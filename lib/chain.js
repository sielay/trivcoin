const EventEmitter = require("events");
const Block = require("./block");

const REPLACED = "blockchainReplaced";

const MAX_REORGANISATION = 10;

class Chain extends EventEmitter {
    constructor(blocksDB, transactionsDB) {
        super();

        this.b = blocksDB;
        this.t = transactionsDB;

        this.b
            .size()
            .then(length => {
                if (length === 0) {
                    return this.b.put(0, Block.genesis);
                }
            })
            .then(() => {
                this.unqueueConfirmed();
            });
    }

    unqueueConfirmed() {

        const that = this;
        return Promise.all(this
            .t
            .ids()
            .map(id => that.
                isConfirmed(that.t.get(id))
                .then(confirmed =>
                    confirmed
                        ? that.t.remove(id)
                        : null)
            ));

    }

    isConfirmed(transaction) {
        const that = this;
        return this.b
            .ids()
            .then(ids => {

                const crawl = () => {
                    const id = ids.shift();
                    if (!id) {
                        return false;
                    }
                    return that.b
                        .get(id)
                        .then(Block.load)
                        .then(block => block.has(transaction))
                        .then(hasTransaction =>
                            hasTransaction
                                ? true
                                : crawl()
                        );
                }

                return crawl();
            });
    }

    findSharedParent(newBlockchain) {

        const chain = [...newBlockchain];
        const that = this;

        if (JSON.stringify(chain[0]) !== JSON.stringify(Block.genesis)) {
            console.error('Genesis blocks aren\'t the same');
            return Promise.resolve(false);
        }

        const index = 1;
        newBlockchain.shift();
        let lastShared = Block.genesis;

        const crawl = () => {            
            const block = newBlockchain.shift();
            if (!block) {

            }
            index++;
            if (block.index !== index) {
                console.error('Block has invalid index', block, index);
                return Promise.resolve(false);
            }            
            return that.b
                .get(index)
                then(myBlock => {
                    if (!myBlock) {
                        return lastShared;
                    }
                    if (JSON.stringify(chain[0]) !== JSON.stringify(myBlock)) {
                        return lastShared;
                    }; 
                    lastShared = myBlock;
                    return crawl(); 
                });
                
        }

        return crawl();

    }

    replaceChain(newBlockchain) {
        const that = this;
        return this.b
            .size()
            .then(currentSize => {
                // It doesn't make sense to replace this blockchain by a smaller one        
                if (newBlockchain.length <= currentSize) {
                    return false;
                }

                const sharedParent = 0;

                const amount = newBlockchain.length - currentSize;
                const sharedParent = currentSize 

                const newBlocks = newBlockchain.slice(currentSize - 1, amount);

                //return that.b.get(newBlocks

                // Verify if the new blockchain is correct
                return that
                    .checkChain(newBlockchain)
                    .then(isOk => {
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

        if (JSON.stringify(chain[0]) !== JSON.stringify(Block.genesis)) {
            console.error('Genesis blocks aren\'t the same');
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
                    .then(valid => {
                        if (!valid) {
                            return false;
                        }
                        return crawl();
                    });
            }

            return crawl();
        } catch (exception) {

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
            console.error(`Invalid proof-of-work`);
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
            throw new BlockAssertionError(`Invalid block balance: inputs sum '${sumOfInputsAmount}', outputs sum '${sumOfOutputsAmount}'`, { sumOfInputsAmount, sumOfOutputsAmount });
        }

        // Check if there is only 1 fee transaction and 1 reward transaction;
        const transactionsByType = newBlock
            .transactions
            .map(transaction => transactions.type)
            .reduce((p, c) => {
                p[c] = (p[c] || 0) + 1;
                return p;
            }, {});

        if (
            !(transactionsByType[Transation.REWARD] === 1 && transactionsByType[Transation.INTEREST] === 0)
            &&
            !(transactionsByType[Transation.REWARD] === 0 && transactionsByType[Transation.INTEREST] === 1)
        ) {
            console.error(`Invalid reward/interest transaction count: got '${transactionsByType[Transation.REWARD]}' rewards and '${transactionsByType[Transation.INTEREST]}' interests `);
            return Promise.resolve(false);
        }

        return Promise.resolve(true);
    }

    checkTransaction(transaction) {

        const that = this;

        // Check the transaction
        if (!transaction.verify()) {
            throw new TransactionAssertionError(`Transaction '${transaction.id}' is invalid`, transaction);
        }

        // Verify if the transaction isn't already in the blockchain

        return 


        let isNotInBlockchain = R.all((block) => {
            return R.none(R.propEq('id', transaction.id), block.transactions);
        }, this.blocks);

        if (!isNotInBlockchain) {
            console.error(`Transaction '${transaction.id}' is already in the blockchain`);
            throw new TransactionAssertionError(`Transaction '${transaction.id}' is already in the blockchain`, transaction);
        }

        // Verify if all input transactions are unspent in the blockchain
        let isInputTransactionsUnspent = R.all(R.equals(false), R.flatten(R.map((txInput) => {
            return R.map(
                R.pipe(
                    R.prop('transactions'),
                    R.map(R.pipe(
                        R.path(['data', 'inputs']),
                        R.contains({ transaction: txInput.transaction, index: txInput.index })
                    ))
                ), this.blocks);
        }, transaction.data.inputs)));

        if (!isInputTransactionsUnspent) {
            console.error(`Not all inputs are unspent for transaction '${transaction.id}'`);
            throw new TransactionAssertionError(`Not all inputs are unspent for transaction '${transaction.id}'`, transaction.data.inputs);
        }

        return true;
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
            if (emit) this.emitter.emit('blockAdded', newBlock);

            return newBlock;
        }
    }
}

module.exports = Chain;
module.exports.REPLACED = REPLACED;
