const Chain = require("./chain");
const DBMock = require("./dbs/mock");

let blocks;
let transactions;

describe("Chain", () => {
    beforeAll(() => {
        blocks = new DBMock();
        transactions = new DBMock();
    });

    it("Creates", () => {
        // eslint-disable-next-line
        const chain = new Chain(blocks, transactions);    
    });

    afterAll(() => {
        blocks = null;
        transactions = null;
    });
});
