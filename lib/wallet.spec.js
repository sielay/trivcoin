const Wallet = require("./wallet");

describe("Walet", () => {

    it("Works", () => {

        const walletA = Wallet.fromPassword("hello world");
        const walletB = Wallet.fromHash(walletA.passwordHash);

        expect(walletA.passwordHash).toEqual(walletB.passwordHash);
        expect(walletA.secret).toBeNull();
        expect(walletB.secret).toBeNull();
        expect(walletA.keyPairs.length).toEqual(0);
        expect(walletB.keyPairs.length).toEqual(0);

        walletA.generateAddress();
        expect(walletA.secret).not.toBeNull();
        expect(walletB.secret).toBeNull();
        expect(walletA.keyPairs.length).toEqual(1);
        expect(walletB.keyPairs.length).toEqual(0);

        walletA.generateAddress();
        expect(walletA.secret).not.toBeNull();
        expect(walletB.secret).toBeNull();
        expect(walletA.keyPairs.length).toEqual(2);
        expect(walletB.keyPairs.length).toEqual(0);

        expect(walletA.keyPairs[0].index).toEqual(1);
        expect(walletA.keyPairs[1].index).toEqual(2);
        expect(walletA.keyPairs[0].secretKey).not.toBeNull();
        expect(walletA.keyPairs[1].secretKey).not.toBeNull();
        expect(walletA.keyPairs[0].publicKey).not.toBeNull();
        expect(walletA.keyPairs[1].publicKey).not.toBeNull();
        expect(walletA.keyPairs[0].secretKey).not.toEqual(walletA.keyPairs[1].secretKey);
        expect(walletA.keyPairs[0].publicKey).not.toEqual(walletA.keyPairs[1].publicKey);

        const json = walletA.toJSON();        
        const walletC = Wallet.fromJson(json);
        expect(walletA.secret).toEqual(walletC.secret);
        expect(walletC.keyPairs.length).toEqual(2);

        expect(walletC.keyPairs[0].index).toEqual(1);
        expect(walletC.keyPairs[1].index).toEqual(2);
        expect(walletC.keyPairs[0].secretKey).toEqual(walletA.keyPairs[0].secretKey)
        expect(walletC.keyPairs[1].secretKey).toEqual(walletA.keyPairs[1].secretKey)
        expect(walletC.keyPairs[0].publicKey).toEqual(walletA.keyPairs[0].publicKey)
        expect(walletC.keyPairs[1].publicKey).toEqual(walletA.keyPairs[1].publicKey)
        

    });

});
