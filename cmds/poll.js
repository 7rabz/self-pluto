const axios = require('axios');

module.exports = {
    name: 'sendembed',
    description: 'Sends a poll embed via webhook and forwards it to the target channel.',
    async execute(client, message, args, settings) {
        console.log(`[DEBUG] Starting sendembed command in channel ${message.channel.id} at ${new Date().toISOString()}`);

        try {
            await message.delete();
            console.log(`[DEBUG] Deleted command message ${message.id} at ${new Date().toISOString()}`);
        } catch (error) {
            console.error(`[ERROR] Failed to delete command message: ${error.message} at ${new Date().toISOString()}`);
        }

        let embed;
        let pollOptions = []; // store options if poll

        try {
            // Get the content after the command prefix (e.g., ";poll")
            const pollContent = message.content.slice(message.content.indexOf('poll') + 4).trim();

            // Use regex to extract question and options between quotes
            const match = pollContent.match(/"([^"]+)"\s*"([^"]+)"/);
            if (!match) {
                embed = {
                    title: "Error",
                    description: 'Please provide both a poll question and options in double quotes. Example: ;poll "Your question" "Option1,Option2,Option3"',
                    color: 0xff0000,
                    footer: { text: settings.embedDefaults.footerText },
                    timestamp: new Date()
                };
            } else {
                const pollQuestion = match[1].trim();
                const optionsString = match[2].trim();

                // Split options by commas and remove empty items
                pollOptions = optionsString.split(',').map(opt => opt.trim()).filter(opt => opt.length > 0);

                console.log(`[DEBUG] Poll options: ${JSON.stringify(pollOptions)}`);

                if (pollOptions.length < 2 || pollOptions.length > 9) {
                    embed = {
                        title: "Error",
                        description: "Invalid number of options. Must be between 2 and 9.",
                        color: 0xff0000,
                        footer: { text: settings.embedDefaults.footerText },
                        timestamp: new Date()
                    };
                } else {
                    // Build the poll description with options
                    const pollDescription = pollOptions.map((option, index) => `Option ${index + 1}: \`${option}\``).join("\n");

                    embed = {
                        title: `❔ | ${pollQuestion} | ❔`,
                        description: pollDescription,
                        color: settings.embedDefaults.color, // Green color
                        footer: { text: settings.embedDefaults.footerText },
                        timestamp: new Date()
                    };
                }
            }
        } catch (error) {
            console.error(`[ERROR] Failed to construct poll embed: ${error.message}`);
            embed = {
                title: "Error",
                description: "An error occurred while creating the poll.",
                color: 0xff0000,
                footer: { text: settings.embedDefaults.footerText },
                timestamp: new Date()
            };
        }

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
        let forwardedMessage;
        try {
            console.log(`[DEBUG] Attempting to forward message ${webhookMessage.id} to channel ${message.channel.id} at ${new Date().toISOString()}`);
            forwardedMessage = await webhookMessage.forward(message.channel);
            console.log(`[DEBUG] Successfully forwarded message. New message ID: ${forwardedMessage.id} at ${new Date().toISOString()}`);
        } catch (error) {
            console.error(`[ERROR] Failed to forward message ${webhookMessage.id}: ${error.message} at ${new Date().toISOString()}`);
            return;
        }

        // If this is a poll embed and valid poll options exist, add reactions to the FORWARDED MESSAGE
        if (pollOptions.length >= 2 && pollOptions.length <= 9) {
            const numberEmojis = ["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣"];
            for (let i = 0; i < pollOptions.length; i++) {
                try {
                    await forwardedMessage.react(numberEmojis[i]);
                    console.log(`[DEBUG] Added reaction ${numberEmojis[i]}  to message ${forwardedMessage.id} at ${new Date().toISOString()}`);
                    // Wait 100ms between reactions to avoid rate limits
                    await new Promise(resolve => setTimeout(resolve, 100));
                } catch (error) {
                    console.error(`[ERROR] Failed to add reaction ${numberEmojis[i]}: ${error.message} at ${new Date().toISOString()}`);
                }
            }
        }
    }
};