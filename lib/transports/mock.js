
class MockTransport {
    constructor() {
        this.pool = {};
    }

    add(address, node) {
        this.pool[address] = node;
    }

    send(to, data) {
        if (this.pool[to]) {
            return this.pool[to].receive(data);
        }
        return Promise.resolve(null);
    }
}

module.exports = MockTransport;
