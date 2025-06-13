const { Client } = require('discord.js-selfbot-v13');
const fs = require('fs').promises;
const path = require('path');
const startTime = Date.now();

let settings;
try {
    settings = require('./settings.json');
    console.log(`[DEBUG] Loaded settings: ${JSON.stringify(settings, null, 2)} at ${new Date().toISOString()}`);
} catch (error) {
    console.error(`[ERROR] Failed to load settings.json: ${error.message} at ${new Date().toISOString()}`);
    process.exit(1);
}

const client = new Client({
    intents: ['GUILDS', 'GUILD_MESSAGES']
});

client.commands = new Map();

client.on('ready', async () => {
    console.log(`[DEBUG] Logged in as ${client.user.tag} (ID: ${client.user.id}) at ${new Date().toISOString()}`);

    try {
        const commandFiles = await fs.readdir(path.join(__dirname, 'cmds'));
        console.log(`[DEBUG] Found files in cmds/: ${commandFiles.join(', ')} at ${new Date().toISOString()}`);
        for (const file of commandFiles) {
            if (!file.endsWith('.js')) {
                console.log(`[DEBUG] Skipping non-JS file: ${file} at ${new Date().toISOString()}`);
                continue;
            }
            try {
                const command = require(`./cmds/${file}`);
                const commandName = file.split('.')[0].toLowerCase();
                client.commands.set(commandName, command);
                console.log(`[DEBUG] Loaded command: ${commandName} from ${file} at ${new Date().toISOString()}`);
            } catch (error) {
                console.error(`[ERROR] Failed to load command ${file}: ${error.message} at ${new Date().toISOString()}`);
            }
        }
        console.log(`[DEBUG] Loaded ${client.commands.size} commands at ${new Date().toISOString()}`);
    } catch (error) {
        console.error(`[ERROR] Failed to read cmds directory: ${error.message} at ${new Date().toISOString()}`);
    }
});

client.on('messageCreate', async (message) => {
      try {
        settings = require('./settings.json');
    } catch (error) {
        console.error(`[ERROR] Failed to load settings.json: ${error.message} at ${new Date().toISOString()}`);
        process.exit(1);
    }

    if (
        !settings.authorizedUsers.includes(message.author.id) &&
        !settings.trustedUsers.includes(message.author.id) &&
        !settings.plutoOwner.includes(message.author.id)
      ) {
        return;
      }
      

    if (!message.content.startsWith(settings.commandPrefix)) {
        return;
    }

    const args = message.content.slice(settings.commandPrefix.length).trim().split(/ +/);
    const commandName = args.shift().toLowerCase();

    console.log(`[DEBUG] Received command: ${commandName} with args: [${args.join(', ')}] from ${message.author.tag} in channel ${message.channel.id} at ${new Date().toISOString()}`);

    const command = client.commands.get(commandName);
    if (!command) {
        console.log(`[DEBUG] Unknown command: ${commandName} at ${new Date().toISOString()}`);
        return;
    }

    try {
        await command.execute(client, message, args, settings, startTime);
        console.log(`[DEBUG] Executed command ${commandName} successfully at ${new Date().toISOString()}`);
    } catch (error) {
        console.error(`[ERROR] Failed to execute command ${commandName}: ${error.message} at ${new Date().toISOString()}`);
        if (settings.developerOptions.enableErrorStackTrace) {
            console.error(`[ERROR] Stack trace: ${error.stack} at ${new Date().toISOString()}`);
        }
    }
});

console.log(`[DEBUG] Starting login with token at ${new Date().toISOString()}`);
client.login(settings.token).catch(error => {
    console.error(`[ERROR] Login failed: ${error.message} at ${new Date().toISOString()}`);
    process.exit(1);
});
