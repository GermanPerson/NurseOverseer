import fs from "node:fs";
import path from 'node:path';
import {
    ChatInputCommandInteraction,
    Client,
    Collection,
    Events,
    GatewayIntentBits,
    GuildMember,
    Interaction,
    Message,
    PartialGuildMember,
    Partials,
    SlashCommandBuilder
} from 'discord.js';
import {token} from './config.json';
import {deletedMessageLogger} from './moderation_plugins/message_logger.ts';
import * as linkify from 'linkifyjs';
import {bondage_handler} from "./moderation_plugins/bondage_handler.ts";
import {guildMemberChange, MembershipChangeType} from "./moderation_plugins/membership_change_handler.ts";
import {messageEditLogger} from "./moderation_plugins/message_edit_logger.ts";

const client : Client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildWebhooks,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMembers
    ],
    partials: [Partials.User, Partials.GuildMember],
});

// @ts-ignore
client.commands = new Collection();
const foldersPath = path.join(import.meta.dir, 'commands');
const commandFolders = fs.readdirSync(foldersPath);

export interface InteractionCommand {
    execute(interaction: ChatInputCommandInteraction): Promise<void>;
    data: SlashCommandBuilder
}

for (const folder of commandFolders) {
    const commandsPath = path.join(foldersPath, folder);
    const commandFiles = fs.readdirSync(commandsPath).filter((file: string) => file.endsWith('.ts'));
    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);

        const importedCommand = await import(filePath)
        const command: InteractionCommand = importedCommand.command;

        console.log(`Loading command ${command.data.name} from ${filePath}`);

        // Set a new item in the Collection with the key as the command name and the value as the exported module
        // @ts-ignore
        client.commands.set(command.data.name, command);
    }
}


client.on(Events.InteractionCreate, async (interaction: Interaction) => {
    if (!interaction.isChatInputCommand()) return;

    // @ts-ignore
    const command = interaction.client.commands.get(interaction.commandName);

    if (!command) {
        console.error(`No command matching ${interaction.commandName} was found.`);
        return;
    }

    try {
        await command.execute(interaction);
    } catch (error) {
        console.error(error);
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp({content: 'There was an error while executing this command!', ephemeral: true});
        } else {
            await interaction.reply({content: 'There was an error while executing this command!', ephemeral: true});
        }
    }
});

client.on(Events.MessageCreate, (message: Message) => {
    if(message.author.bot) return;

    if (message.content.includes("twitter.com") || message.content.includes("x.com")) {
        // Verify that the message contains a link to Twitter/"X" (nobody fucking calls it X)
        // Find all links with Regex

        let matches = linkify.find(message.content)

        let rewrittenURLs = matches.map((url: { type: string; href: string | URL; }) => {
            if (url.type !== "url") return null;
            let formattedURL = new URL(url.href)

            if(!formattedURL.pathname.includes("status") && !formattedURL.pathname.includes("i/")) return null;

            if(formattedURL.host === "x.com") {
                formattedURL.host = "fixupx.com"
                return formattedURL.toString()
            } else if (formattedURL.host === "twitter.com") {
                formattedURL.host = "vxtwitter.com"
                return formattedURL.toString()
            }

            return null;
        }).filter((urlCandidate: string | null) => urlCandidate !== null)

        if (rewrittenURLs.length > 0) {
            message.reply(`Twitter has stopped allowing embeds. Here's the link(s) with working embeds:\n${rewrittenURLs.join("\n")}`)
        }
    }

    bondage_handler(message)
})

client.once(Events.ClientReady, (c: Client) => {
    if (c.user === null) throw new Error("Client user is null");
    console.log(`Ready! Logged in as ${c.user.tag}`);
});

client.on(Events.MessageDelete, deletedMessageLogger);
client.on(Events.MessageUpdate, messageEditLogger);

client.on(Events.GuildMemberAdd, (member: GuildMember) => guildMemberChange(member, MembershipChangeType.JOIN));
client.on(Events.GuildMemberRemove, (member: GuildMember | PartialGuildMember) => guildMemberChange(member, MembershipChangeType.LEAVE));


// Log in to Discord with your client's token
client.login(token);
