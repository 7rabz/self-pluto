const axios = require('axios');

module.exports = {
    name: 'help',
    description: 'Sends an embed via webhook and forwards it to the user.',
    async execute(client, message, args, settings, startTime) {
        console.log(`[DEBUG] Starting sendembed command in channel ${message.channel.id} at ${new Date().toISOString()}`);

        // Delete the command message
        const msToTime = (duration) => {
            let seconds = Math.floor((duration / 1000) % 60);
            let minutes = Math.floor((duration / (1000 * 60)) % 60);
            let hours = Math.floor((duration / (1000 * 60 * 60)) % 24);
            let days = Math.floor(duration / (1000 * 60 * 60 * 24));
        
            return `${days}d ${hours}h ${minutes}m ${seconds}s`;
        };

        const uptime = msToTime(Date.now() - startTime);

        // Create embed
        const embed = {
            title: settings.helpCommandEmbed.title,
            description: `**💌 Welcome to self-pluto! 💌**\n\n> A lightweight and powerful selfbot client for Discord.\n### 📜 Commands:\n- \`${settings.commandPrefix}help\` — Displays this help menu.\n- \`${settings.commandPrefix}sendembed\` — Sends a test embed for debugging. 🤯\n- \`${settings.commandPrefix}cat\` — Sends a random cat image. 🐱\n- \`${settings.commandPrefix}dog\` — Sends a random dog image. 🐶\n- \`${settings.commandPrefix}percentage [type] [ping]\` — Generates a random percentage and labels the user with it!\n- \`${settings.commandPrefix}adduser [mention/reply]\` — Authorize a user to control this client. ✅\n- \`${settings.commandPrefix}deluser [mention/reply]\` — Remove a user from authorized list. ❌\n- \`${settings.commandPrefix}cuddle [mention/reply]\` — Sends an anime cuddle image to a user. 🤗\n- \`${settings.commandPrefix}kiss [mention/reply]\` — Sends an anime kiss image to a user. 😘\n- \`${settings.commandPrefix}flipoff [mention/reply]\` — Sends an anime flip-off image to a user. 🖕\n- \`${settings.commandPrefix}hug [mention/reply]\` — Sends an anime hug image to a user. 🫂\n\n### 🌐 Links:\n- **GitHub:** [self-pluto.xyz](https://github.com/z7rab/self-pluto)\n- **Discord:** [dsc.gg/self-pluto](https://discord.gg/)`,
            color: parseInt(settings.helpCommandEmbed.color),
            fields: [
                { name: "Our Github", value: settings.helpCommandEmbed.github, inline: true },
                { name: "My Discord", value: settings.helpCommandEmbed.discord, inline: true },
                { name: "Credits", value: settings.helpCommandEmbed.credits, inline: true },
                { name: "Information", value: `· Uptime: ${uptime}`, inline: false },
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
