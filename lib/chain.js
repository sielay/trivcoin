const EventEmitter = require("events");
const Block = require("./block");

const REPLACED = "blockchainReplaced";

const MAX_REORGANISATION = 10;

class Chain extends EventEmitter {
    constructor(blocksDB, transactionsDB) {
        super();

        this.b = blocksDB;
        this.t = transactionsDB;

        if (this.b.size() === 0) {
            this.b.put(0, Block.genesis);
        }

        this.unqueueConfirmed();
    }

    unqueueConfirmed() {
        this
            .t
            .ids()
            .forEach(id => {
                const t = this.t.get(id);
                if (this.isConfirmed(t)) {
                    this.t.remove(id);
                }
            });
    }

    isConfirmed(transaction) {
        const blockIds = this.b.ids();
        for (let blockId of blockIds) {
            if (this.b.get(blockId).has(transaction)) {
                return true;
            }
        }
        return false;
    }

    replaceChain(newBlockchain) {
        const currentSize = this.b.size();
        // It doesn't make sense to replace this blockchain by a smaller one        
        if (newBlockchain.length <= currentSize) {
            return false;
        }

        // Verify if the new blockchain is correct
        if (!this.checkChain(newBlockchain)) {
            return false;
        }

        const amount = newBlockchain.length - currentSize;
        const newBlocks = newBlockchain
            .slice(currentSize - 1, amount);

        newBlocks.forEach(block => this.addBlock(block, false));

        this.emitter.emit(REPLACED, newBlocks);
    }

    checkChain(blockchainToValidate) {

        if (JSON.stringify(blockchainToValidate[0]) !== JSON.stringify(Block.genesis)) {
            console.error('Genesis blocks aren\'t the same');
            return false;
        }

        // Compare every block to the previous one (it skips the first one, because it was verified before)
        try {
            for (let i = 1; i < blockchainToValidate.length; i++) {
                this.checkBlock(blockchainToValidate[i], blockchainToValidate[i - 1]);
            }
        } catch (ex) {
            console.error('Invalid block sequence');
            throw new BlockchainAssertionError('Invalid block sequence', null, ex);
        }
        return true;
    }

    checkBlock(newBlock, previousBlock) {
        const blockHash = newBlock.toHash();

        if (previousBlock.index + 1 !== newBlock.index) { // Check if the block is the last one
            console.error(`Invalid index: expected '${previousBlock.index + 1}' got '${newBlock.index}'`);
            return false;
        } else if (previousBlock.hash !== newBlock.parent) { // Check if the previous block is correct
            console.error(`Invalid previoushash: expected '${previousBlock.hash}' got '${newBlock.parent}'`);
            return false;
        } else if (blockHash !== newBlock.hash) { // Check if the hash is correct
            console.error(`Invalid hash: expected '${blockHash}' got '${newBlock.hash}'`);
            return false;
        } else if (!Block.validProof(Block.checkPOW, previousBlock.pow, newBlock.pow, newBlock.hash, newBlock.timestamp)) {
            console.error(`Invalid proof-of-work`);
            return false;
        }

        // For each transaction in this block, check if it is valid
        R.forEach(this.checkTransaction.bind(this), newBlock.transactions);

        // Check if the sum of output transactions are equal the sum of input transactions + MINING_REWARD (representing the reward for the block miner)
        let sumOfInputsAmount = R.sum(R.flatten(R.map(R.compose(R.map(R.prop('amount')), R.prop('inputs'), R.prop('data')), newBlock.transactions))) + MINING_REWARD;
        let sumOfOutputsAmount = R.sum(R.flatten(R.map(R.compose(R.map(R.prop('amount')), R.prop('outputs'), R.prop('data')), newBlock.transactions)));

        let isInputsAmountGreaterOrEqualThanOutputsAmount = R.gte(sumOfInputsAmount, sumOfOutputsAmount);

        if (!isInputsAmountGreaterOrEqualThanOutputsAmount) {
            console.error(`Invalid block balance: inputs sum '${sumOfInputsAmount}', outputs sum '${sumOfOutputsAmount}'`);
            throw new BlockAssertionError(`Invalid block balance: inputs sum '${sumOfInputsAmount}', outputs sum '${sumOfOutputsAmount}'`, { sumOfInputsAmount, sumOfOutputsAmount });
        }

        // Check if there is only 1 fee transaction and 1 reward transaction;
        let transactionsByType = R.countBy(R.prop('type'), newBlock.transactions);
        if (transactionsByType.fee && transactionsByType.fee > 1) {
            console.error(`Invalid fee transaction count: expected '1' got '${transactionsByType.fee}'`);
            throw new BlockAssertionError(`Invalid fee transaction count: expected '1' got '${transactionsByType.fee}'`);
        }

        if (transactionsByType.reward && transactionsByType.reward > 1) {
            console.error(`Invalid reward transaction count: expected '1' got '${transactionsByType.reward}'`);
            throw new BlockAssertionError(`Invalid reward transaction count: expected '1' got '${transactionsByType.reward}'`);
        }

        return true;
    }

    checkTransaction(transaction) {
        // Check the transaction
        transaction.check(transaction);

        // Verify if the transaction isn't already in the blockchain
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
