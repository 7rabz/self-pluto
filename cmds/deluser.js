const fs = require('fs');
const path = require('path');
const axios = require('axios');

module.exports = {
    name: 'deluser',
    description: 'Removes a Discord user ID from the authorizedUsers list and sends confirmation embed.',
    async execute(client, message, args, settings) {
        console.log(`[DEBUG] Starting deluser command in channel ${message.channel.id} at ${new Date().toISOString()}`);

        try {
            await message.delete();
            console.log(`[DEBUG] Deleted command message ${message.id} at ${new Date().toISOString()}`);
        } catch (error) {
            console.error(`[ERROR] Failed to delete command message: ${error.message}`);
        }

        const userId = args[0];
        if (!userId || !/^\d{17,19}$/.test(userId)) {
            console.error(`[ERROR] Invalid Discord ID provided: ${userId}`);
            return;
        }

        const filePath = path.join("D:/Files/Desktop/nightmareenv/nodejs/selfbot/settings.json");

        let fileData;
        try {
            fileData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        } catch (err) {
            console.error(`[ERROR] Failed to read settings.json: ${err.message}`);
            return;
        }

        const index = fileData.authorizedUsers.indexOf(userId);
        if (index !== -1) {
            fileData.authorizedUsers.splice(index, 1);
            try {
                fs.writeFileSync(filePath, JSON.stringify(fileData, null, 4));
                console.log(`[DEBUG] Removed ${userId} from authorizedUsers and updated file.`);
            } catch (err) {
                console.error(`[ERROR] Failed to write to settings.json: ${err.message}`);
                return;
            }
        } else {
            console.log(`[DEBUG] User ${userId} is not in authorizedUsers.`);
        }

        const embed = {
            title: "User Removed 🗑️",
            description: `Removed user from control list.\nThey can no longer control this client.`,
            color: parseInt(settings.embedDefaults.color),
            fields: [
                { name: "User ID", value: userId, inline: true }
            ],
            footer: { text: settings.embedDefaults.footerText },
            timestamp: new Date()
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
