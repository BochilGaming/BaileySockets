class SenderSignatureKey {
    constructor(signatureKeyPublic, signatureKeyPrivate) {
        this.public = signatureKeyPublic
        this.private = signatureKeyPrivate
    }
    static deserialize(data) {
        const obj = new this();
        obj.public = Buffer.from(data.public, 'base64')
        if (data.private) {
            obj.private = Buffer.from(data.private, 'base64')
        }
        return obj
    }

    getPublicKey() {
        return this.public
    }

    getPrivateKey() {
        return this.private
    }

    serialize() {
        return {
            public: this.public.toString('base64'),
            ...(this.private ? { private: this.private.toString('base64') } : {})
        }
    }
}

module.exports = SenderSignatureKey