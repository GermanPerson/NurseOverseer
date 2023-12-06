import {ChatInputCommandInteraction, SlashCommandMentionableOption} from "discord.js";
import {SlashCommandBuilder} from 'discord.js';
import {redis_host} from '../../config.json';
import redis from 'redis';
import {gag_types} from "../../moderation_plugins/bondage_handler.js";
import {InteractionCommand} from "../../main.ts";

const redisClient = redis.createClient({
    url: redis_host,
});
redisClient.connect();

export let command: InteractionCommand = {
    data: new SlashCommandBuilder()
        .setName('ungag')
        .addMentionableOption((option: SlashCommandMentionableOption) => option.setName('user').setDescription('The user to release').setRequired(true))
        .setDescription('Release someone\'s gag.'),
    async execute(interaction: ChatInputCommandInteraction) {
        const user = interaction.options.getUser('user')
        if (!user) {
            await interaction.reply('Please mention a user to ungag.');
            return;
        }

        let existingGag = await redisClient.get(`gagged:${user.id}`)

        if (!existingGag) {
            await interaction.reply({
                content: `${user.displayName} is not gagged.`,
                ephemeral: true,
            });
        } else {
            let { gag_type } = JSON.parse(existingGag);

            await redisClient.del(`gagged:${user.id}`);
            await interaction.reply({
                content: `${user.displayName} has their ${gag_types[gag_type].name} removed by ${interaction.user.displayName}.`,
            });
        }
    },
}
