import {Message, PartialMessage, TextChannel} from "discord.js";
import { Sharp } from "sharp";

const redis = require("redis");
const {EmbedBuilder, AttachmentBuilder} = require("discord.js");
const {redis_host, log_channel} = require("../config.json");
const { AuditLogEvent } = require("discord.js");
const { GridImageJoiner } = require('image-joiner')
const tmp = require("tmp");
const fs = require("fs");
const path = require("path");
const axios = require("axios");

const redisClient = redis.createClient({
    url: redis_host,
});
redisClient.connect();

export async function deletedMessageLogger(message: Message<boolean> | PartialMessage) {
    if (message.partial) {
        return;
    }
    if (message.author.bot) return;

    if (!(message.channel instanceof TextChannel)) return;

    // Verify deleted message wasn't muffled by Overseer
    let muffled = await redisClient.get(`muffled:${message.id}`)
    if (muffled) return;

    if (message.guild === null) return;

    // Fetch audit log
    let auditLog = await message.guild.fetchAuditLogs({type: AuditLogEvent.MessageDelete, limit: 1});
    console.log(auditLog.entries.first())

    let responsibleModerator = null;
    if(auditLog.entries.first() !== undefined) {
        let entry = auditLog.entries.first();
        if (!entry) return;

        console.log(entry.createdAt.getTime() - new Date().getTime())

        // Within 5 seconds of message being deleted
        if(entry.createdAt.getTime() - new Date().getTime() > 5000) {
            // Check if this was done by moderator
            let executor = entry.executor;
            let target = entry.target;

            if (target.id === message.author.id) {
                responsibleModerator = executor;
            }
        }
    }

    // Build deleted message embed
    let embed = new EmbedBuilder()
        .setColor("#ff0000")
        .setTitle("Deleted Message")
        .setTimestamp(Date.now())
        .setDescription(message.content.length > 0 ? `Content: ${message.content}` : "No message content.")
        .addFields(
            {"name": "Channel", "value": message.channel.name},
            {"name": "Author", "value": message.author.displayName},
            {"name": "User ID", "value": message.author.id},
            {"name": "Attachment Count", "value": message.attachments.size.toString() + " attachments"},
        )

    if (responsibleModerator !== null) {
        embed.addFields({ "name": "Responsible Moderator", "value": responsibleModerator.username })
    }


    let tempFile = tmp.fileSync({ postfix: '.jpg' });
    let attachFile = false;

    // Add attachments to embed if any
    if(message.attachments.size > 0) {
        let fileURLs = message.attachments.filter(attachment => attachment.contentType && attachment.contentType.startsWith("image/")).map(attachment => attachment.url);

        const joiner = new GridImageJoiner(Math.ceil(message.attachments.size / 2), 2);

        let row = 0;
        let col = 0;
        // download images
        for (const url of fileURLs) {
            await axios.get(url, {responseType: 'arraybuffer'})
                .then((response: { data: any; }) => {
                    joiner.loadImageFromObj(response.data, {
                        row: row,
                        col: col,
                    });

                    if(col === 1) {
                        col = 0;
                        row++;
                    } else {
                        col++;
                    }
                    console.log("col: " + col + " row: " + row)
                })
        }

        await joiner.draw({
            background_color: "#ffffff",
        }).then((image: Sharp) => image.toFormat("jpeg").toFile(tempFile.name))

        embed.setImage(`attachment://${path.basename(tempFile.name)}`);
        attachFile = true;
    }

    // Send deleted message embed to log channel
    let logChannel = message.guild.channels.cache.find(channel => channel.id === log_channel );
    if (!logChannel || !(logChannel instanceof TextChannel)) {
        console.error(`Could not find channel with id ${log_channel}`);
        tempFile.removeCallback();
        return;
    }

    await logChannel.send({
        embeds: [embed],
        files: attachFile ? [new AttachmentBuilder(tempFile.name)] : [],
    });

    tempFile.removeCallback();
}
