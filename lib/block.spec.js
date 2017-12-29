const Block = require("./block");

describe("Block", () => {

    it("Genesis", () => {
        const checker = s => s.substr(0, 2) === "00";
        const first = new Block(null, []);
        first.mine(123, checker);        
        expect(first.validProof(123, checker)).toEqual(true);
        expect(first.validContent()).toEqual(true);
    });

});
