const util = require("./util");
const crypto = require("crypto");

const TYPE_REWARD = "reward";
const TYPE_INTEREST = "interest";
const TYPE_TRANSFER = "transfer";
const TYPE_STAKE = "stake";
const TYPE_WITHDRAWL = "withdrawl";
const TYPE_PENALITY = "penality";

// TODO
// crawl
// crawl-confirm
// vote
// bet

const POW_REWARD = 100;
const POS_REWARD = .1;
const MAX_POS = 1000000;
const MIN_POS_AGE = 1000 * 60 * 60 * 24 * 7;


// @see https://www.google.co.uk/search?q=casper+algorithm&safe=off&rlz=1C5CHFA_enGB770GB770&source=lnms&tbm=isch&sa=X&ved=0ahUKEwiz_Ni-xq_YAhVLIMAKHWMcDQIQ_AUICigB&biw=1920&bih=1103#imgrc=QRqmijnPcc-ukM:

/**
 * @class Output
 */
class Output {
    /**
     * 
     * @param {Object} json 
     */
    static load(json) {
        return new Output(json.address, json.amount);
    }

    /**
     * @constructor
     * @param {String} address 
     * @param {String} amount 
     */
    constructor(address, amount) {
        this.address = address;
        this.amount = amount;
    }

    /**
     * 
     */
    toJSON() {
        return {
            address: this.address,
            amount: this.amount
        };
    }
}

/**
 * @class Input
 * @extends Output
 */
class Input extends Output {

    /**
     * 
     * @param {Object} json 
     */
    static load(json) {
        const input = new Input(json.address, json.amount);
        input.signature = json.signature;
        input.transaction = json.transaction;
        input.index = json.index;

        return input;
    }

    /**
     * 
     * @param {Output} output - unspent output to use
     * @param {String} outputTransactionId - transaction hash taken from a previous unspent transaction output (64 bytes)
     * @param {Number} outputIndex - index of the transaction taken from a previous unspent transaction output
     * @param {PrivateKey} senderPrivateKey 
     */
    static generate(output, outputTransactionId, outputIndex, senderPrivateKey) {
        const input = new Input(output.address, output.amount);
        input.transaction = outputTransactionId;
        input.index = outputIndex;
        if(senderPrivateKey) {
            input.signature = util.sign(input.transaction + input.address + input.index.toFixed(0) + input.amount.toFixed(0), senderPrivateKey);
        }
        return input;
    }

    verify() {
        return util.verify(this.transaction + this.address + this.index.toFixed(0) + this.amount.toFixed(0), this.signature, this.address);
    }

    /**
     * 
     */
    toJSON() {
        return {
            index: this.index,
            transaction: this.transaction,
            address: this.address,
            amount: this.amount,
            signature: this.signature
        };
    }
}

/**
 * @class Transaction
 */
class Transaction {

    /**
     * 
     * @param {String} type 
     */
    static generate(type) {
        const tx = new Transaction(type);
        tx.timestamp = Math.round(Date.now() / 1000);
        tx.id = util.randomId();
        return tx;
    }

    /**
     * 
     * @param {Number} amount - will be ignored in real life, left here so we can mockup previous transactions
     * @param {String} receiverAddress 
     */
    static reward(receiverAddress, amount) {
        const tx = Transaction.generate(TYPE_REWARD);
        tx.addOutput(receiverAddress, amount || POW_REWARD);
        return tx;
    }

    /**
     * Build regular transaction
     * @param {String} type 
     * @param {Number|undefined} amount 
     * @param {String} sender 
     * @param {String} recipient 
     * @param {PrivateKey} senderPrivateKey 
     * @param {Transaction[]} unspentOutputTransactions 
     */
    static regular(type, amount, sender, recipient, senderPrivateKey, unspentOutputTransactions) {

        const tx = Transaction.generate(type);
        const inputsBalance = unspentOutputTransactions
            .map(i => i.outputs
                .filter(o => o.address === sender)
                .map(o => o.amount)
                .reduce((p, c) => p + c, 0))
            .reduce((p, c) => p + c, 0);

        if (amount !== undefined && amount > inputsBalance) {
            throw new Error("Not enough funds")
        }

        if (amount === undefined) {
            amount = inputsBalance;
        }

        tx.inputs = unspentOutputTransactions
            .map(t => t.outputs
                .filter(t => t.address === sender)
                .map((i, idx) => Input
                    .generate(i, t.id, idx, senderPrivateKey)))
            .reduce((p, c) => p.concat(c), []);

        if (recipient) {

            tx.outputs = [new Output(recipient, amount)];

            if (inputsBalance > amount) {
                tx.outputs.push(new Output(sender, inputsBalance - amount));
            }

        } else {
            tx.outputs = [];
        }

        return tx;
    }

    /**
     * 
     * @param {Number} amount 
     * @param {String} sender 
     * @param {String} recipient 
     * @param {PrivateKey} senderPrivateKey 
     * @param {Transaction[]} unspentOutputTransactions 
     */
    static transfer(amount, sender, recipient, senderPrivateKey, unspentOutputTransactions) {
        return Transaction.regular(TYPE_TRANSFER, amount, sender, recipient, senderPrivateKey, unspentOutputTransactions);
    }

    /**
     * 
     * @param {Number} amount 
     * @param {String} sender 
     * @param {PrivateKey} senderPrivateKey 
     * @param {Transaction[]} unspentOutputTransactions 
     */
    static stack(amount, sender, senderPrivateKey, unspentOutputTransactions) {
        if (amount > MAX_POS) {
            throw new Error("Too big amount for POS");
        }
        return Transaction.regular(TYPE_STAKE, amount, sender, sender + ":PoS", senderPrivateKey, unspentOutputTransactions);
    }

    /**
     * 
     * @param {String} recipient 
     * @param {Transaction[]} outputTransactions 
     * @param {PrivateKey} senderPrivateKey 
     */
    static withdrawl(recipient, outputTransactions, senderPrivateKey) {
        return Transaction.regular(TYPE_WITHDRAWL, undefined, recipient + ":PoS", recipient, senderPrivateKey, outputTransactions);
    }

    /**
     * 
     * @param {String} recipient 
     * @param {Transaction[]} outputTransactions 
     */
    static penality(recipient, outputTransactions) {
        return Transaction.regular(TYPE_PENALITY, undefined, recipient + ":PoS", undefined, null, outputTransactions);
    }

    /**
     * 
     * @param {String} recipient 
     * @param {Transaction[]} stackingTransactions 
     * @param {PrivateKey} senderPrivateKey
     */
    static interest(recipient, stackingTransactions, senderPrivateKey) {
        const now = Math.round(Date.now() / 1000);
        const tx = Transaction.generate(TYPE_INTEREST);

        const stakes = stackingTransactions
            .filter(i => i.type === TYPE_STAKE && now - MIN_POS_AGE >= i.timestamp);
        const stakeBalance = stakes
            .map(i => i.outputs
                .filter(o => o.address === recipient + ":PoS")
                .map(o => o.amount)
                .reduce((p, c) => p + c, 0))
            .reduce((p, c) => p + c, 0);

        const amount = Math.ceil(stakeBalance * POS_REWARD);

        tx.inputs = stakes
            .map(t => t.outputs
                .filter(t => t.address === recipient + ":PoS")
                .map((i, idx) => Input
                    .generate(i, t.id, idx, senderPrivateKey)))
            .reduce((p, c) => p.concat(c), []);

        tx.outputs = [new Output(recipient, amount)];
        return tx;
    }

    /**
     * 
     * @param {Object} json 
     */
    static load(json) {

        const tx = new Transaction(json.type);
        tx.timestamp = json.timestamp;
        tx.id = json.id;
        tx.inputs = json.data.inputs.map(j => Input.load(j));
        tx.outputs = json.data.outputs.map(j => Output.load(j));

        if (util.hash(json.id + JSON.stringify(json.data)) !== json.hash) {
            throw Error("Invalid transation");
        }

        if (tx.getOutBalance() < 1 && tx.type !== TYPE_PENALITY) {
            throw new Error("Empty transaction");
        }

        switch (tx.type) {
            case TYPE_REWARD: {
                if (tx.getOutBalance() !== POW_REWARD) {
                    throw Error("Invalid output balance");
                }
                break;
            }
            case TYPE_INTEREST: {
                // check balance by block
                break;
            }
            case TYPE_PENALITY: {
                if (tx.getOutBalance() > 0 || tx.getInBalance() < 1) {
                    throw Error("Invalid balances");
                }
                break;
            }
            default: {
                if (tx.getOutBalance() < 1 && tx.getOutBalance() !== tx.getInBalance()) {
                    throw Error("Invalid balances");
                }
            }
        }
        return tx;
    }

    /**
     * @constructor
     * @param {String} type 
     */
    constructor(type) {
        this.type = type;
        this.outputs = [];
        this.inputs = [];
    }

    /**
     * @returns {Number}
     */
    getOutBalance() {
        return this.outputs.reduce((p, c) => p + c.amount, 0);
    }

    /**
     * @returns {Number}
     */
    getInBalance() {
        return this.inputs.reduce((p, c) => p + c.amount, 0);
    }

    /**
     * 
     * @param {String} receiverAddress 
     * @param {Number} amount 
     */
    addOutput(receiverAddress, amount) {
        this.outputs.push(new Output(receiverAddress, amount));
    }

    /**
     * 
     * @param {PublicKey} senderPublicKey 
     */
    verify() {
        return this.inputs
            .map(input => {
                return input.verify();                
            })
            .reduce((p, c) => c === false ? c : p, true);
    }

    /**
     * 
     */
    toJSON() {

        const data = {
            inputs: this.inputs.map(i => i.toJSON()),
            outputs: this.outputs.map(i => i.toJSON())
        };

        return {
            id: this.id,
            type: this.type,
            timestamp: this.timestamp,
            data,
            hash: util.hash(this.id + JSON.stringify(data))
        };
    }

}

module.exports = Transaction;
module.exports.Input = Input;
module.exports.Output = Output;
module.exports.REWARD = TYPE_REWARD;
module.exports.INTEREST = TYPE_INTEREST;
module.exports.TRANSFER = TYPE_TRANSFER;
module.exports.PENALITY = TYPE_PENALITY;
module.exports.STAKE = TYPE_STAKE;
module.exports.WITHDRAWL = TYPE_WITHDRAWL;
module.exports.POW_REWARD = POW_REWARD;
module.exports.POS_REWARD = POS_REWARD;
module.exports.MAX_POS = MAX_POS;
