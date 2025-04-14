const fs = require('fs');
const path = require('path');
const axios = require('axios');

module.exports = {
    name: 'deltrusteduser',
    description: 'Removes a Discord user ID from the trustedUsers list and sends confirmation embed.',
    async execute(client, message, args, settings) {
        console.log(`[DEBUG] Starting deluser command in channel ${message.channel.id} at ${new Date().toISOString()}`);
        if (!settings.plutoOwner.includes(message.author.id)) {
            return;
        }

        let userId;
        if (args[0] && message.mentions.users.size > 0) {
            userId = message.mentions.users.first().id;
        } else {
            console.error(`[ERROR] No valid user mention provided.`);
            return;
        }

        if (!/^\d{17,19}$/.test(userId)) {
            console.error(`[ERROR] Invalid Discord ID extracted: ${userId}`);
            return;
        }

        const filePath = settings.SettingsFilePath;

        let fileData;
        try {
            fileData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        } catch (err) {
            console.error(`[ERROR] Failed to read settings.json: ${err.message}`);
            return;
        }

        const index = fileData.trustedUsers.indexOf(userId);
        if (index !== -1) {
            fileData.trustedUsers.splice(index, 1);
            try {
                fs.writeFileSync(filePath, JSON.stringify(fileData, null, 4));
                console.log(`[DEBUG] Removed ${userId} from trustedUsers and updated file.`);
            } catch (err) {
                console.error(`[ERROR] Failed to write to settings.json: ${err.message}`);
                return;
            }
        } else {
            console.log(`[DEBUG] User ${userId} is not in trustedUsers.`);
        }

        const embed = {
            title: "🗑️ User Deauthorization Complete",
            description: `> The specified user has been **removed** from the authorized list.\nThey no longer have control over this client.`,
            color: 0xFF0000,
            fields: [
                {
                    name: "👤 Removed User",
                    value: `<@${userId}> (\`${userId}\`)`,
                    inline: false
                },
                {
                    name: "🔒 Previous Access Level",
                    value: "**Medium (🟠)** — Access to normal commands",
                    inline: false
                },
                {
                    name: "🧹 Removal Effect",
                    value: "All permissions have been revoked.",
                    inline: false
                }
            ],
            footer: {
                text: settings.embedDefaults.footerText
            },
            timestamp: new Date().toISOString()
        };        

        console.log(`[DEBUG] Prepared embed: ${JSON.stringify(embed, null, 2)}`);

        let webhookChannelId;
        try {
            webhookChannelId = settings.forwardChannelId;
            const webhookResponse = await axios.post(settings.webhookUrl, { embeds: [embed] });
            if (webhookResponse.status === 204) {
                console.log(`[DEBUG] Webhook sent successfully (status: ${webhookResponse.status})`);
            } else {
                console.error(`[ERROR] Webhook failed with status: ${webhookResponse.status}`);
                return;
            }
        } catch (error) {
            console.error(`[ERROR] Failed to send webhook: ${error.message}`);
            return;
        }

        let webhookChannel;
        try {
            webhookChannel = await client.channels.fetch(webhookChannelId);
        } catch (error) {
            console.error(`[ERROR] Failed to fetch webhook channel: ${error.message}`);
            return;
        }

        await new Promise(resolve => setTimeout(resolve, settings.rateLimitDelay));

        let webhookMessage;
        try {
            const messages = await webhookChannel.messages.fetch({ limit: 1 });
            webhookMessage = messages.first();
            if (!webhookMessage) return;
        } catch (error) {
            console.error(`[ERROR] Failed to fetch webhook message: ${error.message}`);
            return;
        }

        try {
            const forwardedMessage = await webhookMessage.forward(message.channel);
            console.log(`[DEBUG] Forwarded message ID: ${forwardedMessage.id}`);
        } catch (error) {
            console.error(`[ERROR] Failed to forward message: ${error.message}`);
        }
    }
};