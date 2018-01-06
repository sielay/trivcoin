class MockDB {

    constructor() {
        this.collection = {};
    }

    put(id, data) {
        const that = this;
        return new Promise(resolve => {
            that.collection[id] = data;
            resolve(data);
        });
    }

    get(id) {
        const that = this;
        return new Promise(resolve => {
            resolve(that.collection[id]);
        });
    }

    remove(id) {
        const that = this;
        return new Promise(resolve => {
            delete this.collection[id];
            resolve();
        });
    }

    ids() {
        const that = this;
        return new Promise(resolve => {
            resolve(Object.keys(this.collection));
        });
    }

    size() {
        return this.ids().then(ids => ids.length);
    }

    list() {
        const that = this;
        return new Promise(resolve => resolve(
            Object
                .keys(this.collection)
                .map(key => this.collection[key])));
    }

    sort(sorter) {
        return this.sort().then(list => list.sort(sorter));
    }

    slice(sorter, start, end) {
        return this.sort(soter).then(list => list.slice(start, end));
    }

}

module.exports = MockDB;
