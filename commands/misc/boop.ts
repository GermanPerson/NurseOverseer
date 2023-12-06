import {ChatInputCommandInteraction} from "discord.js";

import {SlashCommandBuilder} from 'discord.js';
import {InteractionCommand} from "../../main.ts";

export let command: InteractionCommand = {
    data: new SlashCommandBuilder()
        .setName('boop')
        .setDescription('Boop the nurse'),
    async execute(interaction: ChatInputCommandInteraction) {
        await interaction.reply(`Booped!\nhttps://tenor.com/view/boop-gif-21745456`);
    },
}
