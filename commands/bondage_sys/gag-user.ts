import {
    ChatInputCommandInteraction,
    SlashCommandBuilder
} from 'discord.js';
import {redis_host} from '../../config.json';
import redis from 'redis';
import {gag_types} from '../../moderation_plugins/bondage_handler.ts';
import fs from 'fs';
import path from 'node:path';
import {InteractionCommand} from "../../main.ts";

const redisClient = redis.createClient({
    url: redis_host,
});
redisClient.connect();

const gagPath = path.join(__dirname, '../../assets/gag_in/')
const gaggingFiles = fs.readdirSync(gagPath).filter(file => file.endsWith('.gif'));

type Gag = {
    name: String,
    value: String,
}

export let command: InteractionCommand = {
    data: new SlashCommandBuilder()
        .setName('gag')
        .addMentionableOption(option => option.setName('user').setDescription('The user whose mouth to shut up').setRequired(true))
        .addStringOption(option => option.setName("gag_type").setDescription("The type of gag to use").setRequired(true)
            .addChoices(
                ...Object.keys(gag_types).map(gag_type => {
                    return {
                        "name": gag_types[gag_type].name,
                        "value": gag_type,
                    }
                })
            ))
        .setDescription('Push a nice gag into someone\'s mouth'),
    async execute(interaction: ChatInputCommandInteraction) {
        const user = interaction.options.getUser('user')
        const author = interaction.user.username;
        const guild = interaction.guild?.name;
        const gag_type = interaction.options.getString('gag_type') as keyof typeof gag_types || 'ballgag';

        if (!user) {
            await interaction.reply('Please mention a user to gag.');
            return;
        }

        // We ain't gagging ourselves. Block gags on client ID.
        if (interaction.client.user.id === user.id) {
            await interaction.reply({
                content: `I'm not gagging myself. Nice try.`,
                ephemeral: false,
            });
            return;
        }

        // Check if the user is already gagged
        let existingGag = await redisClient.get(`gagged:${user.id}`)

        await redisClient.set(`gagged:${user.id}`, JSON.stringify({
            author,
            guild,
            gag_type,
        }));

        let gagGif = path.join(gagPath, gaggingFiles[Math.floor(Math.random() * gaggingFiles.length)]);

        if (existingGag) {
            let lines = [
                `The old gag is removed from ${user.displayName}'s mouth, making way for a new ${gag_types[gag_type].name} courtesy of ${interaction.user.displayName}.`,
                `${interaction.user.displayName} deftly swaps out ${user.displayName}'s gag for a more suitable ${gag_types[gag_type].name}.`,
                `With a swift change, ${user.displayName}'s previous gag is replaced by ${interaction.user.displayName} with a ${gag_types[gag_type].name}.`,
                `${user.displayName}'s silence is renewed as ${interaction.user.displayName} fits them with a fresh ${gag_types[gag_type].name}.`,
                `Out with the old, in with the new: ${user.displayName} now sports a ${gag_types[gag_type].name}, thanks to ${interaction.user.displayName}.`,
                `A quick switcheroo by ${interaction.user.displayName} leaves ${user.displayName} with a brand-new ${gag_types[gag_type].name}.`,
                `Replacing the silence, ${interaction.user.displayName} secures a ${gag_types[gag_type].name} gag on ${user.displayName}.`,
                `${interaction.user.displayName} upgrades ${user.displayName}'s gag to the latest ${gag_types[gag_type].name} model.`,
                `The transition is seamless as ${interaction.user.displayName} fits a ${gag_types[gag_type].name} onto ${user.displayName}.`,
                `${user.displayName}'s muffled thanks can be heard as ${interaction.user.displayName} replaces their gag with a new ${gag_types[gag_type].name}.`
            ]
            let line = lines[Math.floor(Math.random() * lines.length)];

            await interaction.reply({
                content: line + `\nDescription: ${gag_types[gag_type].description}`,
                files: [gagGif],
            });
        } else {
            let lines = [
                `${interaction.user.displayName} gently places a ${gag_types[gag_type].name} between ${user}'s lips.`,
                `With care, ${interaction.user.displayName} fits a ${gag_types[gag_type].name} into ${user}'s mouth.`,
                `${interaction.user.displayName} softly inserts a ${gag_types[gag_type].name} into ${user}'s mouth, ensuring comfort.`,
                `${gag_types[gag_type].name}'s gag is tenderly positioned by ${interaction.user.displayName} in ${user}'s mouth.`,
                `The ${gag_types[gag_type].name} is carefully nudged into place by ${interaction.user.displayName} within ${user}'s mouth.`,
                `${interaction.user.displayName} affectionately secures a ${gag_types[gag_type].name} in ${user}'s mouth.`,
                `${interaction.user.displayName} delicately administers a ${gag_types[gag_type].name} to ${user}, ensuring a snug fit.`,
                `Gently, ${interaction.user.displayName} guides a ${gag_types[gag_type].name} past ${user}'s lips.`,
                `${interaction.user.displayName} ensures ${user} is comfortably gagged with a ${gag_types[gag_type].name}.`,
                `${interaction.user.displayName} smoothly eases a ${gag_types[gag_type].name} into place for ${user}.`,
                `${interaction.user.displayName} lovingly pushes a ${gag_types[gag_type].name} into ${user}'s mouth.`
            ];

            let line = lines[Math.floor(Math.random() * lines.length)];
            await interaction.reply({
                content: line + `\nDescription: ${gag_types[gag_type].description}`,
                files: [gagGif],
            });
        }
    },
}
