const Block = require("./block");
const Transaction = require("./transaction");

describe("Block", () => {

    it("Checking", () => {
        const checker = s => s.substr(0, 2) === "00";
        const first = new Block(null, []);
        first.mine(123, checker);        
        expect(first.validProof(123, checker)).toEqual(true);
        expect(first.validContent()).toEqual(true);
    });

    it("Genesis", () => {
        expect(Block.validProof(s => s.substr(0, 4) === "0000", 0, Block.genesis.pow, Block.genesis.hash, Block.genesis.timestamp)).toEqual(true);
        // const genesisBlock = new Block(null, []);
        // genesisBlock.timestamp = 1465900260;
        // genesisBlock.mine(0, s => (s.substr(0, 4) === "0000"), true);
        // console.log(genesisBlock.toJSON());

    });

    it("Mine first blocks", () => {
        return;
        const chain = [Block.genesis];
        
        while(true) {
            const trans = new Transaction("reward");
            const previous = chain[chain.length - 1];
            trans.addOutput("062ed7f90244324218c37a2b3bbcb8e43d9b711bae3db471d6a82af649dfa13f", 100);
            const block = new Block(previous, trans);
            block.mine(previous.pow, 
            console.log(JSON.stringify(block.toJSON()));
            chain.push(block);
        }

    });

});
