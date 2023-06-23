const SenderKeyRecord = require("./sender_key_record");
const SenderKeyDistributionMessage = require("./sender_key_distribution_message");
const keyhelper = require("./keyhelper");

class GroupSessionBuilder {
    constructor(senderKeyStore) {
        this.senderKeyStore = senderKeyStore;
    }

    /**
     * @param {string} senderKeyName 
     * @param {SenderKeyDistributionMessage} senderKeyDistributionMessage 
     */
    async process(senderKeyName, senderKeyDistributionMessage) {
        /** @type {SenderKeyRecord} */
        const senderKeyRecord = await this.senderKeyStore.loadSenderKey(senderKeyName)
        senderKeyRecord.addSenderKeyState(
            senderKeyDistributionMessage.getId(),
            senderKeyDistributionMessage.getIteration(),
            senderKeyDistributionMessage.getChainKey(),
            null,
            senderKeyDistributionMessage.getSignatureKey()
        )
        await this.senderKeyStore.storeSenderKey(senderKeyName, senderKeyRecord)
    }

    async create(senderKeyName) {
        /** @type {SenderKeyRecord} */
        const senderKeyRecord = await this.senderKeyStore.loadSenderKey(senderKeyName)
        if (senderKeyRecord.isEmpty()) {
            const keyId = keyhelper.generateSenderKeyId()
            const senderKey = keyhelper.generateSenderKey()
            const signingKey = keyhelper.generateSenderSigningKey()
            senderKeyRecord.addSenderKeyState(keyId, 0, senderKey, signingKey)
        }
        const state = senderKeyRecord.getOpenSession()
        const senderKeyDistributionMessage = new SenderKeyDistributionMessage(
            state.getKeyId(),
            state.getChainKey().getCounter(),
            state.getChainKey().getKey(),
            state.getSignKey().getPublicKey()
        )
        await this.senderKeyStore.storeSenderKey(senderKeyName, senderKeyRecord)
        return senderKeyDistributionMessage
    }
}

module.exports = GroupSessionBuilder