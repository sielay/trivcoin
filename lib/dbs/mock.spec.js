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

        return dbA.size()
            .then(size => {
                expect(size).toEqual(1);
                return dbB.size();
            })
            .then(size => {
                expect(size).toEqual(0);
                return dbA.get("A");
            })
            .then(value => {
                expect(value).toEqual(123);
                return dbA.get("B");
            })
            .then(value => {
                expect(value).toEqual(undefined);
                return dbA.get("C");
            })
            .then(value => {
                expect(value).toEqual(undefined);
                return dbA.list();
            })
            .then(value => {
                expect(value).toEqual([123]);
                return dbA.sort(sorter);
            })
            .then(value => {
                expect(value).toEqual([123]);
                return dbA.slice(sorter, 0, 5);
            })
            .then(value => {
                expect(value).toEqual([123]);
                return dbA.slice(sorter, 1, 5);
            })
            .then(value => {
                expect(value).toEqual([]);
                return dbA.put("A", 124);
            })
            .then(value => {
                return dbA.size();
            })
            .then(value => {
                expect(value).toEqual(1);
                return dbB.size();
            })
            .then(value => {
                expect(value).toEqual(0);
                return dbA.get("A");
            })
            .then(value => {
                expect(value).toEqual(124);
                return dbA.get("B");
            })
            .then(value => {
                expect(value).toEqual(undefined);
                return dbA.get("C");
            })
            .then(value => {
                expect(value).toEqual(undefined);
                return dbA.list(sorter);
            })
            .then(value => {
                expect(value).toEqual([124]);
                return dbA.slice(sorter, 0, 5);
            })
            .then(value => {
                expect(value).toEqual([124]);
                return dbA.slice(sorter, 1, 5);
            })
            .then(value => {
                expect(value).toEqual([]);
                return dbA.put("B", 125);
            })
            .then(() => {
                return dbA.size();
            })
            .then(value => {
                expect(value).toEqual(2);
                return dbB.size();
            })
            .then(value => {
                value.toEqual(0);
                return dbA.get("A");
            })
            .then(value => {
                value.toEqual(124);
                return dbA.get("B");
            })
            .then(value => {
                value.toEqual(125);
                return dbA.get("C");
            })
            .then(value => {
                value.toEqual(123);
                return dbA.list(sorter);
            })
            .then(value => {
                value.toEqual([124, 125]);
                return dbA.slice(sorter, 0, 5);
            })
            .then(value => {
                value.toEqual([124, 125]);
                return dbA.slice(sorter, 1, 5);
            })
            .then(value => {
                value.toEqual([125]);
                return dbA.put("C", 123);
            })
            .then(() => {
                return dbA.size();
            })
            .then(value => {
                expect(value).toEqual(2);
                return dbB.size();
            })
            .then(value => {
                expect(value).toEqual(0);
                return dbA.get("A");
            })
            .then(value => {
                expect(value).toEqual(124);
                return dbA.get("B");
            })
            .then(value => {
                expect(value).toEqual(125);
                return dbA.get("C");
            })
            .then(value => {
                expect(value).toEqual(123);
                return dbA.list(sorter);
            })
            .then(value => {
                expect(value).toEqual([123, 124, 125]);
                return dbA.slice(sorter, 0, 5);
            })
            .then(value => {
                expect(value).toEqual([123, 124, 125]);
                return dbA.slice(sorter, 1, 5);
            })
            .then(value => {
                expect(value).toEqual([124, 125]);
            });
    })

});
