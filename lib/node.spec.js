const Node = require("./node");
const TransportMock = require("./transports/mock");
// const DBMock = require("./dbs/mock");

let transport = new TransportMock();

process.on("unhandledRejection", (reason, p) => {
    console.log("Possibly Unhandled Rejection at: Promise ", p, " reason: ", reason);
    process.exit(-1);
    // application specific logging here
});

//  /------------F
// v             ^
// A <--> B <--- D
// ^      ^
// C <--- E

let A;
let B;
let C;
let D;
let E;
let F;

describe("Node", () => {
    beforeAll(() => {
        A = new Node(transport, "A");
        B = new Node(transport, "B");
        C = new Node(transport, "C");
        D = new Node(transport, "D");
        E = new Node(transport, "E");
        F = new Node(transport, "F");
        transport.add("A", A);
        transport.add("B", B);
        transport.add("C", C);
        transport.add("D", D);
        transport.add("E", E);
        transport.add("F", F);

        return Promise.all([
            A.addPeers(["B"]),
            B.addPeers(["A"]),
            C.addPeers(["A"]),
            D.addPeers(["B", "F"]),
            E.addPeers(["B", "C"]),
            F.addPeers(["A", "Z"]),
        ]);
    });

    it("Ping", (done) => {
        A.ping(123).then(() => {
            setTimeout(() => {
                expect(A.lastPing).toEqual(123);
                expect(B.lastPing).toEqual(123);
                expect(C.lastPing).toEqual(123);
                expect(D.lastPing).toEqual(123);
                expect(E.lastPing).toEqual(123);
                expect(F.lastPing).toEqual(123);
                expect(A.peers).toEqual(["B", "C", "F"]);
                expect(B.peers).toEqual(["A", "D", "E"]);
                expect(C.peers).toEqual(["A", "E"]);
                expect(D.peers).toEqual(["B", "F"]);
                expect(E.peers).toEqual(["B", "C"]);
                expect(F.peers).toEqual(["D", "A", "Z"]);
                done();
            }, 10);
        });
    });

    afterAll(() => {
        transport = null;
        A = null;
        B = null;
        C = null;
        D = null;
        E = null;
        F = null;
    });
});
