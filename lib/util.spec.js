require("jasmine");
const edDSA = require("ed25519");
const util = require("./util");

describe("Util", () => {

    it("Generates keys and use them", () => {
        
        const message = "Hello world!";

        const keyPairA = util.createKeyPair();
        const keyPairB = util.createKeyPair();

        const privA = util.privateKey(keyPairA.private);
        const privB = util.privateKey(keyPairB.private);

        const pubA = util.publicKey(keyPairA.public);
        const pubB = util.publicKey(keyPairB.public);

        // URSA works as expected
        const msg = "IT’S A SECRET TO EVERYBODY.";
        
        const enc = pubA.encrypt(msg, "utf8", "base64");
        const sig = privB.hashAndSign("sha256", msg, "utf8", "base64");
        
        const rsv = privA.decrypt(enc, "base64", "utf8");
        expect(msg).toEqual(rsv);
        const rsv2 = new Buffer(rsv).toString("base64");
        expect(pubB.hashAndVerify("sha256", rsv2, sig, "base64"));

        // UTIL works as expteced
        
        const encoded = util.encrypt(message, pubA);
        const sign = util.RSAsign(message, privB);

        expect(util.decrypt(encoded, privA)).toEqual(message);         
        expect(util.RSAverify(message, sign, pubB)).toEqual(true);
        expect(util.RSAverify(encoded, sign, pubB)).toEqual(false);
        expect(util.RSAverify(encoded, sign, pubA)).toEqual(false);
        expect(util.RSAverify(message, sign, pubA)).toEqual(false);
        expect(util.RSAverify("dupa", sign, pubB)).toEqual(false);
        expect(util.RSAverify("dupa", sign, pubA)).toEqual(false)

    });

    it("supports EdDSA", () => {
        const keyPairRaw = edDSA.MakeKeypair(new Buffer(util.hash("whatever"), "hex"));
        const pub = keyPairRaw.publicKey.toString("hex");
        const priv = keyPairRaw.privateKey.toString("hex");              

        expect(new Buffer(pub, "hex")).toEqual(keyPairRaw.publicKey);
        expect(new Buffer(priv, "hex")).toEqual(keyPairRaw.privateKey);

        const message = "Lorem ipsum";
        const signature = util.sign(message, priv);

        expect(util.verify(message, signature, pub)).toEqual(true);
    });
    
});
