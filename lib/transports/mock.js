const EventEmitter = require('events');

class MockTransport {
    constructor() {
        this.pool = {};
    }

    add(address, node) {
        this.pool[address] = new EventEmitter();
        this.pool[address].on("request", data => node.receive(data));
    }

    send(to, data) {
        if (!this.pool[to]) {
            return false;
        }
        this.pool[to].emit("request", data);
        return true;
    }
}

module.exports = MockTransport;
