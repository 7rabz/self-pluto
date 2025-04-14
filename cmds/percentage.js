const axios = require('axios');

module.exports = {
    name: 'percentage',
    description: 'Returns a random funny percentage value in an embed.',
    async execute(client, message, args, settings) {
        console.log(`[DEBUG] Starting funnyembed command in channel ${message.channel.id} at ${new Date().toISOString()}`);

        // Delete the command message
        // Randomize percentage
        const randomPercentage = Math.floor(Math.random() * 101);

        // Define the type of fun percentage
        const command = args[0]?.toLowerCase();
        let descriptionText = '';

        switch (command) {
            case 'gay':
                descriptionText = `${args[1] || 'User'} is ${randomPercentage}% gay!`;
                break;
            case 'furry':
                descriptionText = `${args[1] || 'User'} is ${randomPercentage}% furry!`;
                break;
            case 'femboy':
                descriptionText = `${args[1] || 'User'} is ${randomPercentage}% femboy!`;
                break;
            default:
                descriptionText = `${args[1] || 'User'} is ${randomPercentage}% ${args[0]}!`;
                break;
        }

        // Create embed
        const embed = {
            title: 'percentage creator 3000 <:kitty:1350858005515599932>',
            description: descriptionText,
            color: 0x0099ff,
            footer: { text: settings.embedDefaults.footerText },
            timestamp: new Date().toISOString()
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
            console.log(`[DEBUG] Attempting to forward message ${webhookMessage.id} to channel ${message.channel.id} at ${new Date().toISOString()}`);
            const forwardedMessage = await webhookMessage.forward(message.channel);
            console.log(`[DEBUG] Successfully forwarded message. New message ID: ${forwardedMessage.id} at ${new Date().toISOString()}`);
        } catch (error) {
            console.error(`[ERROR] Failed to forward message ${webhookMessage.id}: ${error.message} at ${new Date().toISOString()}`);
        }
    }
};
