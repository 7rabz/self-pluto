const fs = require('fs');
const path = require('path');
const axios = require('axios');

module.exports = {
    name: 'hug',
    description: 'Sends an embed with an anime hug image for the mentioned or replied-to user.',
    async execute(client, message, args, settings) {
        console.log(`[DEBUG] Starting hug command in channel ${message.channel.id} at ${new Date().toISOString()}`);
        if (!settings.trustedUsers.includes(message.author.id)) {
            return;
        }

        let userId;
        // Check if the message is a reply
        if (message.reference && message.reference.messageId) {
            try {
                const repliedMessage = await message.channel.messages.fetch(message.reference.messageId);
                userId = repliedMessage.author.id;
            } catch (error) {
                console.error(`[ERROR] Failed to fetch replied message: ${error.message}`);
                return;
            }
        } 
        // If not a reply, check for a mention
        else if (args[0] && message.mentions.users.size > 0) {
            userId = message.mentions.users.first().id;
        } 
        else {
            console.error(`[ERROR] No valid user mention or reply provided.`);
            return;
        }

        if (!/^\d{17,19}$/.test(userId)) {
            console.error(`[ERROR] Invalid Discord ID extracted: ${userId}`);
            return;
        }

        let imageUrl;
        try {
            const response = await axios.get('https://nekos.best/api/v2/hug');
            imageUrl = response.data.results[0].url;
            console.log(`[DEBUG] Fetched hug image URL: ${imageUrl}`);
        } catch (error) {
            console.error(`[ERROR] Failed to fetch hug image: ${error.message}`);
            return;
        }

        const embed = {
            title: "nya!~ so warm..",
            description: `> <@${message.author.id}> gives <@${userId}> a big hug!\nSpread the love!`,
            color: parseInt(settings.embedDefaults.color),
            fields: [
                {
                    name: "👤 Hugged User",
                    value: `<@${userId}> (\`${userId}\`)`,
                    inline: false
                }
            ],
            image: {
                url: imageUrl
            },
            footer: {
                text: settings.embedDefaults.footerText
            },
            timestamp: new Date()
        };
                
        console.log(`[DEBUG] Prepared embed: ${JSON.stringify(embed, null, 2)} at ${new Date().toISOString()}`);

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