import {Embed, EmbedBuilder, Message, PartialMessage, TextChannel} from "discord.js";
import {log_channel} from '../config.json';

function highlightDifferences(original: string, updated: string): string {
    let result = "";
    let changeBuffer = "";
    let inChange = false;
    let i = 0, j = 0;

    while (i < original.length || j < updated.length) {
        const charFromOriginal = original[i] || '';
        const charFromUpdated = updated[j] || '';

        if (charFromOriginal !== charFromUpdated) {
            changeBuffer += charFromUpdated;
            inChange = true;
            j++;
        } else {
            if (inChange) {
                result += `**${changeBuffer}**`;
                changeBuffer = "";
                inChange = false;
            } else {
                i++;
                j++;
                result += charFromOriginal;
            }
        }
    }

    if (inChange) {
        result += `*${changeBuffer}*`;
    }

    return result;
}

export async function messageEditLogger(old: Message | PartialMessage, edited: Message | PartialMessage) {
    if(edited.author?.bot) {
        console.log("Message edited owned by bot, ignoring");
        return;
    }
    if (!edited.content) return;
    if (old.partial || edited.partial) return;
    if (old.content === edited.content) return;

    let embed = new EmbedBuilder()
        .setColor("#ffff00")
        .setTitle("Edited Message")
        .setTimestamp(Date.now())
        .addFields(
            {
                name: "Author",
                value: old.author.username,
            },
            {
                name: "Channel",
                value: old.channel.toString(),
            },
            {
                name: "Original Message",
                value: old.content,
            },
            {
                name: "Edited Message",
                value: highlightDifferences(
                    old.content.replace("*", ""),
                    edited.content.replace("*", "")
                ),
            }
        );

    const channel = await edited.client.channels.fetch(log_channel) as TextChannel;

    if (!channel) {
        console.error(`Could not find channel with id ${log_channel}`);
        return;
    }

    if (!embed) {
        console.error("Embed was null");
        return;
    }

    await channel.send({embeds: [embed]}).catch(console.error);
}