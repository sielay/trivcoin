class MockDB {

    constructor() {
        this.collection = {};
    }

    put(id, data) {
        this.collection[id] = data;
    }

    get(id) {
        return this.collection[id];
    }

    remove(id) {
        delete this.collection[id];
    }

    ids() {
        return Object.keys(this.collection);
    }

    size() {
        return this.ids().length;
    }

    list() {
        return Object
            .keys(this.collection)
            .map(key => this.collection[key]);
    }

    sort(sorter) {
        return this.list().sort(sorter);
    }

    slice(sorter, start, end) {
        return this.sort(sorter).slice(start, end);
    }

}

module.exports = MockDB;
