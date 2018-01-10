# TrivCoin Whitepaper

**Revision Jan 10th 2018**

## Motivation

*TrivCoin* is result of actual need. We work on project heavily dependant on crawlers that collect *changes to semantic datasets*.

We wanted to establish protocol that helps us:

 * build motivation to build crawlers and collect data
 * transfer value from demand for data to effort for gathering it
 * allow other people participate in solution growth and use technologies of their choice

*TrivCoin* becase *lightweight, fair-security token meant to fuel large scale, small size operations and data transfers.

## Goals

 * Low CPU/GPU requirements
 * Partially shareded (DAO-parallel chains)
 * Usable both in server and serverless architectures (microservice-friendly)
 * Allowing limited set of smart contacts, which don't compromise security for flexibility
   * Stakes (for PoS and DAOs)
   * Orders (for creating demand for crawlers work)
   * Votes (for DAOs)
   * Freezes (to defence against speculation)

## Inspirations

 * Ethereum Casper for PoS implementation
 * [NaiveCoin](https://github.com/conradoqg/naivecoin) for basis of NodeJS implementation
 * [Dash](https://dashpay.atlassian.net/wiki/spaces/DOC/pages/1146918/X11) foe X11 hashes
 * [BlackCoin](https://bitcointalk.org/index.php?topic=469640.0) for economics and rollout ideas

## Economics

### Coin creation

 * TrivCoins are being created while mining
   * PoW will last as long nodes will find it worth mining
   * Reward is 100 TrivCoin per block
   * Reward can be disabled/enabled by vote of the network
 * TrivCoins are created from interest billed weekly (7days) on 6% APR
   * Stake needs to be deposited for 7 continous days to earn interest
   * Interest can be disabled/enabled by vote of the network

```javascript
const reward = Math.floor((7 * STAKE * 5%)/365)
```

Days |	1,000 |	10,000	| 100,000 |	1,000,000
---- | ------ | ------- | ------- | --------
7	   | 1	    | 11	    | 115	    | 1,150 
14	 | 2	    | 23      |	230	    | 2,301
21	 | 3	    | 34	    | 345	    | 3,452
105	 | 17	    | 172	    | 1,726	  | 17,260
203	 | 33	    | 333	    | 3,336	  | 33,369
301  | 49	    | 494     | 4,947	  | 49,479
364	 | 59	    | 598	    | 5,983	  | 59,835   

### Coin disposal

 * Coins are *ereased* as penality
 * Node voting for two competing blocks loses it *whole stake* used to vote
 * Node voting for two competing chains (TBD - need to understand how Casper does it)

### Value sources

 * Demand on data
 * Effort to find data 
 * Value of data harvested
 * Fiat and Altcoin exchanges

### Security from economics

 * See [Coin disposal](#coin-disposal).

## Technical Specification

### Structure

```
+------+       +------+      +--------+
| Node |<----->| Node |<-----| Wallet |
+------+       +------+      +--------+
    ^              ^
    |              |
+----------+ +----------+
| Merchant | | Supplier |
+----------+ +----------+

```

#### Node

 * Nodes are entities that *MUST* hold a copy of the main chain and *MAY* hold some pending transactions and parallel chains
 * **Nothing stops Node from playing other roles in the network**

#### Wallet

 * Wallet stores private-public key pair for specific addresses
 * Private keys are used to sign transactions, so should be kept secret as they guard coin ownership
 * Public keys are addresses to which coins are assigned in transactions
 * Wallet can hold unlimited list of addresses
 * Wallet is meant to be encrypted and used by specific user only (online/shared wallets are insecure and possibly fauds)
 * **Nothing stops Wallet from playing other roles in the network**

#### Merchant

 * Merchant is entity being or with access to a Wallet that create bets on specific data updates.
 * Merchant **freeze** portion of own coins in smart contract called an **Order**
 * Order specify circumstances under which portion of allocated coins will be transfered to Supplier providing data update.
 * Order can specify total budget
 * Order can specify reward size (as amount or any function of total budget and unspent part of the budget)
 * Order can specify number of other crawlers that have to confirm data change and time in which confirmations are expected, as well reward for confirmations
 * Order can specify characteristics of data that updates are expected: 
   * RegExp representing accepted canonnical URLS of the data item
   * Schema.org data item type
   * Properties or sub items where change should occur
 * Order can be confirmed only by entity that knew previous value. Initial value does not count as a change and is not rewarded.

#### Supplier

 * Supplier is entity being or with access to a Wallet that bets on specific Orders
 * Supplier decides if want to compete on specific data updates and tries to inform about change to the data first
 * Supplier also verifies other suppliers bets
 * Supplier can be rewarded with coin for delivering change first or for confirming
 * Supplier can be banned or penalised for suppliying false data update
 * Supplier can be banned or penalised for unfair voting (voting for same change against two other suppliers, against himself or his address or, or pro and against same data change)

### Transaction

### Format

Example based on [NaiveCoin](https://github.com/conradoqg/naivecoin#transaction-structure) with further amendments

```javascript
{ // Transaction
    "id": "84286bba8d...7477efdae1", // random id (64 bytes)
    "hash": "f697d4ae63...c1e85f0ac3", // hash taken from the contents of the transaction: sha256-hex (id + JSON.stringify(data)) (64 bytes)
    "type": "transfer", // transaction type
    "data": {
        "inputs": [ // Transaction inputs
            {
                "transaction": "9e765ad30c...e908b32f0c", // transaction hash taken from a previous unspent transaction output (64 bytes)
                "index": 0, // index of the transaction taken from a previous unspent transaction output
                "amount": 5000000000, // amount of satoshis
                "address": "dda3ce5aa5...b409bf3fdc", // from address (64 bytes)
                "signature": "27d911cac0...6486adbf05" // transaction input hash: sha256 (transaction + address + int(index) + int(amount)) signed with owner address's secret key (128 bytes)
            }
        ],
        "outputs": [ // Transaction outputs
            {
                "amount": 10000, // amount of satoshis
                "address": "4f8293356d...b53e8c5b25" // to address (64 bytes)
            },
            {
                "amount": 4999989999, // amount of satoshis
                "address": "dda3ce5aa5...b409bf3fdc" // change address (64 bytes)
            }
        ]
    }
}
```

### Transaction Types

| Name  | Description | Constrains
| ----  | ----------- | ---------
| `transfer` | Move of coints from **n** number of input addresses to **m** number of output addresses | Sum of inputs *MUST* be equal or greater than sum of outputs
| `reward` | Is given for mining successful POW block | Sum of outputs must me equal to `100`
| `interest` | Is given for stake used to successful creation of POW block | Sum of outputs must be equal to 
| `stake` |
| `withdrawl` |
| `penality` |
| `order` |
| `vote` |



### Block

Example based on [NaiveCoin](https://github.com/conradoqg/naivecoin#block-structure) with further amendments

```javascript
{ // Block
    "index": 0, // (first block: 0)
    "parent": "0", // (hash of previous block, first block is 0) (64 bytes)
    "timestamp": 1465154705, // number of seconds since January 1, 1970
    "pow": 0, // nonce used to identify the proof-of-work step.  
    "transactions": [ // list of transactions inside the block
        { 
          ...
        }
    ],
    "hash": "c4e0b8df46...199754d1ed" // hash taken from the contents of the block(64 bytes)
}
```

#### Block hash

```javascript
crypto
    .createHmac("sha256", this.index.toFixed(0)).update(JSON.stringify({
                index: this.index,
                parent: this.parent,
                timestamp: this.timestamp,
                pow: this.pow,
                transactions: this.transactions.map(t => t.toJSON)
            }))
    .digest("base64");
```

### Chain

### Block Creation

### POW

### POS

### Consensus

### Voting


