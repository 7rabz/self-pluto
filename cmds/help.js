const axios = require('axios');

module.exports = {
    name: 'help',
    description: 'Sends an embed via webhook and forwards it to the user.',
    async execute(client, message, args, settings) {
        console.log(`[DEBUG] Starting sendembed command in channel ${message.channel.id} at ${new Date().toISOString()}`);

        // Delete the command message
        try {
            await message.delete();
            console.log(`[DEBUG] Deleted command message ${message.id} at ${new Date().toISOString()}`);
        } catch (error) {
            console.error(`[ERROR] Failed to delete command message: ${error.message} at ${new Date().toISOString()}`);
        }

        // Create embed
        const embed = {
            title: settings.helpCommandEmbed.title,
            description: settings.helpCommandEmbed.description,
            color: parseInt(settings.helpCommandEmbed.color),
            fields: [
                { name: "Our Github", value: settings.helpCommandEmbed.github, inline: true },
                { name: "My Discord", value: settings.helpCommandEmbed.discord, inline: true },
                { name: "Credits", value: settings.helpCommandEmbed.credits, inline: true },
            ],
            footer: { text: settings.helpCommandEmbed.footerText },
            timestamp: new Date()
        };

        console.log(`[DEBUG] Prepared embed: ${JSON.stringify(embed, null, 2)} at ${new Date().toISOString()}`);

        // Send embed via webhook
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

        // Fetch the webhook's channel
        let webhookChannel;
        try {
            webhookChannel = await client.channels.fetch(webhookChannelId);
            console.log(`[DEBUG] Fetched webhook channel: ${webhookChannel.name} (ID: ${webhookChannel.id}) at ${new Date().toISOString()}`);
        } catch (error) {
            console.error(`[ERROR] Failed to fetch webhook channel ${webhookChannelId}: ${error.message} at ${new Date().toISOString()}`);
            return;
        }

        // Wait to ensure message is processed
        console.log(`[DEBUG] Waiting ${settings.rateLimitDelay}ms for webhook message at ${new Date().toISOString()}`);
        await new Promise(resolve => setTimeout(resolve, settings.rateLimitDelay));

        // Fetch the latest message
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

        // Fetch the target channel
        let targetChannel;
        try {
            targetChannel = await client.channels.fetch(settings.forwardChannelId);
            console.log(`[DEBUG] Fetched target channel: ${targetChannel.name} (ID: ${targetChannel.id}) at ${new Date().toISOString()}`);
        } catch (error) {
            console.error(`[ERROR] Failed to fetch target channel ${settings.forwardChannelId}: ${error.message} at ${new Date().toISOString()}`);
            return;
        }

        // Forward the message
        try {
            console.log(`[DEBUG] Attempting to forward message ${webhookMessage.id} to channel ${settings.forwardChannelId} at ${new Date().toISOString()}`);
            const forwardedMessage = await webhookMessage.forward(message.channel);
            console.log(`[DEBUG] Successfully forwarded message. New message ID: ${forwardedMessage.id} at ${new Date().toISOString()}`);
        } catch (error) {
            console.error(`[ERROR] Failed to forward message ${webhookMessage.id}: ${error.message} at ${new Date().toISOString()}`);
        }
    }
};
