class MockDB {
    constructor() {
        this.collection = {};
    }

    put(id, data) {
        const that = this;
        return new Promise((resolve) => {
            that.collection[id] = data;
            resolve(data);
        });
    }

    get(id) {
        const that = this;
        return new Promise((resolve) => {
            resolve(that.collection[id]);
        });
    }

    has(id) {
        const that = this;
        return new Promise(resolve => resolve(that.collection[id] !== undefined));
    }

    remove(id) {
        const that = this;
        return new Promise((resolve) => {
            delete that.collection[id];
            resolve();
        });
    }

    ids() {
        const that = this;
        return new Promise(resolve => resolve(Object.keys(that.collection)));
    }

    size() {
        return this.ids().then(ids => ids.length);
    }

    list() {
        const that = this;
        return new Promise(resolve => resolve(Object
            .keys(that.collection)
            .map(key => that.collection[key])));
    }

    sort(sorter) {
        return this.sort().then(list => list.sort(sorter));
    }

    slice(sorter, start, end) {
        return this.sort(sorter).then(list => list.slice(start, end));
    }
}

module.exports = MockDB;
