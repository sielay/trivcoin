const Block = require("./block");

describe("Block", () => {
    it("Checking", () => {
        const checker = s => s.substr(0, 2) === "00";
        const first = new Block(null, []);
        first.mine(123, checker);
        expect(first.validProof(123, checker)).toEqual(true);
        expect(first.validContent()).toEqual(true);
    });

    it("Genesis", () => {
        expect(Block
            .validProof(s => s
                .substr(0, 4) === "0000", 0, Block.genesis.pow, Block.genesis.hash, Block.genesis.timestamp))
            .toEqual(true);
    });
});
