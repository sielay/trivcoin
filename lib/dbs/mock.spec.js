const MockDB = require("./mock");

describe("DB Mock", () => {

    it("Works as expected", () => {
        const dbA = new MockDB();
        const dbB = new MockDB();

        expect(dbA.size()).toEqual(0);
        expect(dbB.size()).toEqual(0);

        dbA.put("A", 123);

        const sorter = (a, b) => {
            if (a === b) {
                return 0;
            }
            return a < b ? -1 : 1;
        }

        expect(dbA.size()).toEqual(1);
        expect(dbB.size()).toEqual(0);
        expect(dbA.get("A")).toEqual(123);
        expect(dbA.get("B")).toEqual(undefined);
        expect(dbA.get("C")).toEqual(undefined);
        expect(dbA.list()).toEqual([123]);
        expect(dbA.sort(sorter)).toEqual([123]);
        expect(dbA.slice(sorter, 0, 5)).toEqual([123]);
        expect(dbA.slice(sorter, 1, 5)).toEqual([]);

        dbA.put("A", 124);

        expect(dbA.size()).toEqual(1);
        expect(dbB.size()).toEqual(0);
        expect(dbA.get("A")).toEqual(124);
        expect(dbA.get("B")).toEqual(undefined);
        expect(dbA.get("C")).toEqual(undefined);
        expect(dbA.list(sorter)).toEqual([124]);
        expect(dbA.slice(sorter, 0, 5)).toEqual([124]);
        expect(dbA.slice(sorter, 1, 5)).toEqual([]);

        dbA.put("B", 125);

        expect(dbA.size()).toEqual(2);
        expect(dbB.size()).toEqual(0);
        expect(dbA.get("A")).toEqual(124);
        expect(dbA.get("B")).toEqual(125);
        expect(dbA.get("C")).toEqual(123);
        expect(dbA.list(sorter)).toEqual([124, 125]);
        expect(dbA.slice(sorter, 0, 5)).toEqual([124, 125]);
        expect(dbA.slice(sorter, 1, 5)).toEqual([125]);

        dbA.put("C", 123);

        expect(dbA.size()).toEqual(2);
        expect(dbB.size()).toEqual(0);
        expect(dbA.get("A")).toEqual(124);
        expect(dbA.get("B")).toEqual(125);
        expect(dbA.get("C")).toEqual(123);
        expect(dbA.list(sorter)).toEqual([123, 124, 125]);
        expect(dbA.slice(sorter, 0, 5)).toEqual([123, 124, 125]);
        expect(dbA.slice(sorter, 1, 5)).toEqual([124, 125]);
    })

});
