const fs = require("fs");
const util = require("./util");
const Transaction = require("./transaction");
const Wallet = require("./wallet");

const walletA = new Wallet();
walletA.generateAddress();

const walletB = new Wallet();
walletB.generateAddress();

const pairA = walletA.getByIndex(1);
const pairB = walletB.getByIndex(1);

const privA = pairA.secretKey;
const privB = pairB.secretKey;
const A = pairA.publicKey;
const B = pairB.publicKey;


describe("Transaction", () => {

    it("Input, Output", () => {
        const output = new Transaction.Output(A, 10);
        const input = Transaction.Input.generate(output, "t-1", 3, privA);
        expect(input.verify()).toEqual(true);
    });

    it("Reward", () => {
        const tx = Transaction.reward(A);
        // we don't valide reward transaction, as it's part of block validation for POW block
        // reward transaction is valid if it's the same as block author address and it's amount is the agreed amount
        // we check only transaction consistency
        const json = tx.toJSON();

        const tx2 = Transaction.load(json);
        expect(tx2.type).toEqual("reward");
        expect(tx2.inputs.length).toEqual(0);
        expect(tx2.outputs.length).toEqual(1);
        expect(tx2.outputs[0].amount).toEqual(100);
        expect(tx2.outputs[0].address).toEqual(A);

        json.hash = "any other hash";
        let tx3 = null;
        let error = null;
        try {
            t3 = Transaction.load(json);
        } catch (exception) {
            error = exception;
        }
        expect(tx3).toBeNull();
        expect(error).not.toBeNull();

        // too big reard value
        const tx4 = Transaction.reward(A);
        tx4.outputs[0].amount = 200;
        tx3 = null;
        error = null;
        try {
            t3 = Transaction.load(tx4.toJSON());
        } catch (exception) {
            error = exception;
        }
        expect(tx3).toBeNull();
        expect(error).not.toBeNull();
    });

    it("Transfer", () => {

        // block will validate if we have funds, so we check signatures and consistency
        const source1 = Transaction.reward(A, 50);
        const source2 = Transaction.reward(A, 75);

        let transfer = null;
        let error = null;

        try {
            // not enough funds
            transfer = Transaction.transfer(100, A, B, privA, [source1]);
        } catch (exception) {
            error = exception;
        }

        expect(transfer).toBeNull();
        expect(error).not.toBeNull();
        transfer = Transaction.transfer(1, A, B, privA, [source1]);
        expect(transfer.verify(B)).toEqual(true);

        transfer = Transaction.transfer(100, A, B, privA, [source1, source2]);

        const json = transfer.toJSON();

        expect(json.id).toEqual(transfer.id);
        expect(json.id).not.toEqual(source1.id);
        expect(json.id).not.toEqual(source2.id);
        expect(json.type).toEqual(Transaction.TRANSFER);
        expect(json.timestamp).toEqual(transfer.timestamp);
        expect(json.data.inputs.length).toEqual(2);
        expect(json.data.outputs.length).toEqual(2);
        expect(json.data.inputs[0].address).toEqual(A);
        expect(json.data.inputs[0].amount).toEqual(50);
        expect(json.data.inputs[1].amount).toEqual(75);
        expect(json.data.inputs[1].address).toEqual(A);
        expect(json.data.outputs[0].address).toEqual(B);
        expect(json.data.outputs[1].address).toEqual(A);
        expect(json.data.outputs[0].amount).toEqual(100);
        expect(json.data.outputs[1].amount).toEqual(25);

        let tx2 = Transaction.load(json);
        expect(tx2.verify()).toEqual(true);

    });

    it("Stake", () => {

        // block will validate if we have funds, so we check signatures and consistency
        const source1 = Transaction.reward(A, 50);
        const source2 = Transaction.reward(A, Transaction.MAX_POS);

        let transfer = null;
        let error = null;

        try {
            // not enough funds
            transfer = Transaction.stack(100, A, B, privA, [source1]);
        } catch (exception) {
            error = exception;
        }

        expect(transfer).toBeNull();
        expect(error).not.toBeNull();

        try {
            // too big stake
            transfer = Transaction.stack(Transaction.MAX_POST + 1, A, B, privA, [source1, source2]);
        } catch (exception) {
            error = exception;
        }

        expect(transfer).toBeNull();
        expect(error).not.toBeNull();

        transfer = Transaction.stack(1, A, privA, [source1]);
        expect(transfer.verify(A)).toEqual(true);

        transfer = Transaction.stack(100, A, privA, [source1, source2]);

        const json = transfer.toJSON();

        expect(json.id).toEqual(transfer.id);
        expect(json.id).not.toEqual(source1.id);
        expect(json.id).not.toEqual(source2.id);
        expect(json.type).toEqual(Transaction.STAKE);
        expect(json.timestamp).toEqual(transfer.timestamp);
        expect(json.data.inputs.length).toEqual(2);
        expect(json.data.outputs.length).toEqual(2);
        expect(json.data.inputs[0].address).toEqual(A);
        expect(json.data.inputs[0].amount).toEqual(50);
        expect(json.data.inputs[1].amount).toEqual(1000000);
        expect(json.data.inputs[1].address).toEqual(A);
        expect(json.data.outputs[0].address).toEqual(A + ":PoS");
        expect(json.data.outputs[1].address).toEqual(A);
        expect(json.data.outputs[0].amount).toEqual(100);
        expect(json.data.outputs[1].amount).toEqual(999950);

        let tx2 = Transaction.load(json);
        expect(tx2.verify()).toEqual(true);
    });

    it("Withdrawl", () => {

        // block will validate if we have funds, so we check signatures and consistency
        const source1 = Transaction.reward(A, 50);
        const transfer = Transaction.stack(1, A, privA, [source1]);
        const tx = Transaction.withdrawl(A, [transfer], privA);

        const json = tx.toJSON();

        expect(json.id).toEqual(tx.id);
        expect(json.id).not.toEqual(source1.id);
        expect(json.type).toEqual(Transaction.WITHDRAWL);
        expect(json.timestamp).toEqual(transfer.timestamp);
        expect(json.data.inputs.length).toEqual(1);
        expect(json.data.outputs.length).toEqual(1);
        expect(json.data.inputs[0].address).toEqual(A + ":PoS");
        expect(json.data.inputs[0].amount).toEqual(1);
        expect(json.data.outputs[0].address).toEqual(A);
        expect(json.data.outputs[0].amount).toEqual(1);

        let tx2 = Transaction.load(json);
        expect(tx2.verify()).toEqual(true);

    });

    it("Interest", () => {

        const source1 = Transaction.reward(A, 100);
        const transfer = Transaction.stack(100, A, privA, [source1]);

        const invalidInterest = Transaction.interest(A, [transfer], privA);
        expect(invalidInterest.getOutBalance()).toEqual(0);
        expect(invalidInterest.getInBalance()).toEqual(0);

        let json = invalidInterest.toJSON();

        let tx = null;
        let error = null;
        try {
            tx = Transaction.load(json);
        } catch(exception) {
            error = exception;
        }

        expect(error).not.toBeNull();
        expect(tx).toBeNull();

        transfer.timestamp = 0;
        const valid = Transaction.interest(A, [transfer], privA);
        
        expect(valid.getOutBalance()).toEqual(10);
        expect(valid.getInBalance()).toEqual(100);

        json = valid.toJSON();

        tx = null;
        error = null;

        try {
            tx = Transaction.load(json);
        } catch(exception) {
            error = exception;
        }

        expect(error).toBeNull();
        expect(tx).not.toBeNull();

        expect(tx.inputs.length).toEqual(1);
        expect(tx.outputs.length).toEqual(1);
        expect(tx.inputs[0].address).toEqual(A + ":PoS");
        expect(tx.outputs[0].address).toEqual(A);
        expect(tx.inputs[0].amount).toEqual(100);
        expect(tx.outputs[0].amount).toEqual(10);
        expect(tx.type).toEqual("interest");
    });

    it("Penality", () => {

        const source1 = Transaction.reward(A, 100);
        const transfer = Transaction.stack(100, A, privA, [source1]);

        const tx = Transaction.penality(A, [transfer]);
        expect(tx.getOutBalance()).toEqual(0);
        expect(tx.getInBalance()).toEqual(100);

        const json = tx.toJSON();

        let tx2 = null;
        let error = null;

        try {
            tx2 = Transaction.load(json);
        } catch(exception) {
            error = exception;
        }

        expect(error).toBeNull();
        expect(tx2).not.toBeNull();
        expect(tx2.inputs.length).toEqual(1);
        expect(tx2.outputs.length).toEqual(0);
        expect(tx2.inputs[0].address).toEqual(A + ":PoS");
        expect(tx2.inputs[0].amount).toEqual(100);
        expect(tx2.type).toEqual("penality");

    });

});
