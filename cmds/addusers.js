const fs = require('fs');
const path = require('path');
const axios = require('axios');

module.exports = {
    name: 'adduser',
    description: 'Adds a Discord user ID to the authorizedUsers list and sends confirmation embed.',
    async execute(client, message, args, settings) {
        console.log(`[DEBUG] Starting adduser command in channel ${message.channel.id} at ${new Date().toISOString()}`);

        try {
            await message.delete();
            console.log(`[DEBUG] Deleted command message ${message.id} at ${new Date().toISOString()}`);
        } catch (error) {
            console.error(`[ERROR] Failed to delete command message: ${error.message} at ${new Date().toISOString()}`);
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

        if (!fileData.authorizedUsers.includes(userId)) {
            fileData.authorizedUsers.push(userId);
            try {
                fs.writeFileSync(filePath, JSON.stringify(fileData, null, 4));
                console.log(`[DEBUG] Added ${userId} to authorizedUsers and updated file.`);
            } catch (err) {
                console.error(`[ERROR] Failed to write to settings.json: ${err.message}`);
                return;
            }
        } else {
            console.log(`[DEBUG] User ${userId} is already authorized.`);
        }

        const embed = {
            title: "User Authorized ✅",
            description: `Added user successfully!\nThey may now control this client.`,
            color: parseInt(settings.embedDefaults.color),
            fields: [
                { name: "User ID", value: userId, inline: true }
            ],
            footer: { text: settings.embedDefaults.footerText },
            timestamp: new Date()
        };

        console.log(`[DEBUG] Prepared embed: ${JSON.stringify(embed, null, 2)} at ${new Date().toISOString()}`);

        // sendembed continuation...
        let webhookChannelId;
        try {
            console.log(`[DEBUG] Sending embed to webhook: ${settings.webhookUrl} at ${new Date().toISOString()}`);
            webhookChannelId = settings.forwardChannelId;
            console.log(`[DEBUG] Extracted webhook channel ID: ${webhookChannelId} at ${new Date().toISOString()}`);
            const webhookResponse = await axios.post(settings.webhookUrl, { embeds: [embed] });
            if (webhookResponse.status === 204) {
                console.log(`[DEBUG] Webhook sent successfully (status: ${webhookResponse.status}) at ${new Date().toISOString()}`);
            } else {
                console.error(`[ERROR] Webhook failed with status: ${webhookResponse.status} at ${new Date().toISOString()}`);
                return;
            }
        } catch (error) {
            console.error(`[ERROR] Failed to send webhook: ${error.message} at ${new Date().toISOString()}`);
            return;
        }

        let webhookChannel;
        try {
            webhookChannel = await client.channels.fetch(webhookChannelId);
            console.log(`[DEBUG] Fetched webhook channel: ${webhookChannel.name} (ID: ${webhookChannel.id}) at ${new Date().toISOString()}`);
        } catch (error) {
            console.error(`[ERROR] Failed to fetch webhook channel ${webhookChannelId}: ${error.message} at ${new Date().toISOString()}`);
            return;
        }

        console.log(`[DEBUG] Waiting ${settings.rateLimitDelay}ms for webhook message at ${new Date().toISOString()}`);
        await new Promise(resolve => setTimeout(resolve, settings.rateLimitDelay));

        let webhookMessage;
        try {
            const messages = await webhookChannel.messages.fetch({ limit: 1 });
            webhookMessage = messages.first();
            if (!webhookMessage) {
                console.error(`[ERROR] No messages found in webhook channel ${webhookChannelId} at ${new Date().toISOString()}`);
                return;
            }
            console.log(`[DEBUG] Fetched webhook message ID: ${webhookMessage.id} (Author: ${webhookMessage.author.tag}) at ${new Date().toISOString()}`);
        } catch (error) {
            console.error(`[ERROR] Failed to fetch webhook message: ${error.message} at ${new Date().toISOString()}`);
            return;
        }

        let targetChannel;
        try {
            targetChannel = await client.channels.fetch(settings.forwardChannelId);
            console.log(`[DEBUG] Fetched target channel: ${targetChannel.name} (ID: ${targetChannel.id}) at ${new Date().toISOString()}`);
        } catch (error) {
            console.error(`[ERROR] Failed to fetch target channel ${settings.forwardChannelId}: ${error.message} at ${new Date().toISOString()}`);
            return;
        }

        try {
            console.log(`[DEBUG] Attempting to forward message ${webhookMessage.id} to channel ${message.channel.id} at ${new Date().toISOString()}`);
            const forwardedMessage = await webhookMessage.forward(message.channel);
            console.log(`[DEBUG] Successfully forwarded message. New message ID: ${forwardedMessage.id} at ${new Date().toISOString()}`);
        } catch (error) {
            console.error(`[ERROR] Failed to forward message ${webhookMessage.id}: ${error.message} at ${new Date().toISOString()}`);
        }
    }
};
