class SenderChainKey {
    constructor(counter, key) {
        this.counter = counter
        this.key = key
    }
    static deserialize(data) {
        const obj = new this();
        obj.counter = data.counter
        obj.key = Buffer.from(data.key, 'base64')
        return obj
    }

    getCounter() {
        return this.counter
    }

    getKey() {
        return this.key
    }

    serialize() {
        return {
            counter: this.counter,
            key: this.key.toString('base64')
        }
    }
}

module.exports = SenderChainKey