const Chain = require("./chain");
const DBMock = require("./dbs/mock");

let blocks, transactions, chain

describe("Chain", () => {

    beforeAll(() => {
        blocks = new DBMock();
        transactions = new DBMock();
    });

    it("Creates", () => {

        chain = new Chain(blocks, transactions);

    });

    afterAll(() => {
        chain = null;
        blocks = null;
        transactions = null;
    });

});
