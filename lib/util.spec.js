require("jasmine");
const edDSA = require("ed25519");
const util = require("./util");

describe("Util", () => {
    it("supports EdDSA", () => {
        const keyPairRaw = edDSA.MakeKeypair(Buffer.from(util.hash("whatever"), "hex"));
        const pub = keyPairRaw.publicKey.toString("hex");
        const priv = keyPairRaw.privateKey.toString("hex");

        expect(Buffer.from(pub, "hex")).toEqual(keyPairRaw.publicKey);
        expect(Buffer.from(priv, "hex")).toEqual(keyPairRaw.privateKey);

        const message = "Lorem ipsum";
        const signature = util.sign(message, priv);

        expect(util.verify(message, signature, pub)).toEqual(true);
    });
});
