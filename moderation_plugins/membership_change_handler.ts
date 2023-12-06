import {log_channel} from '../config.json';
import {EmbedBuilder, GuildMember, PartialGuildMember, TextChannel, User} from "discord.js";

export enum MembershipChangeType {
    JOIN,
    LEAVE,
}

export async function guildMemberChange(member: GuildMember | PartialGuildMember, type: MembershipChangeType) {
    let fetchedUser: User | null = null;

    // Partial users have to be hydrated first
    if (member.partial) {
        console.log("Fetching partial member data from API")
        fetchedUser = await member.client.users.fetch(member.id);
        console.log("Fetched member data from API: " + member.user.username)
    } else {
        fetchedUser = member.user;
    }

    const channel = await member.client.channels.fetch(log_channel) as TextChannel;
    if (!channel) {
        console.error(`Could not find channel with id ${log_channel}`);
        return;
    }

    let embed = new EmbedBuilder()
        .setTimestamp(Date.now())
        .addFields(
            {
                name: "Username",
                value: fetchedUser.username,
            },
            {
                name: "ID",
                value: fetchedUser.id,
            },
            {
                name: "Created At",
                value: fetchedUser.createdAt.toUTCString() ?? "Unknown",
            },
        )
        .setThumbnail(fetchedUser.avatarURL() ?? "");

    // If the original member is NOT a partial, we can get more information
    if (!member.partial && type === MembershipChangeType.LEAVE) {
        let roles = member.roles.cache.filter(role => role.name != "@everyone").map(role => role.name).join(", ");
        embed.addFields(
            {
                name: "Joined At",
                value: member.joinedAt?.toUTCString() ?? "Unknown",
            },
            {
                name: "Nickname",
                value: member.nickname ?? "None",
            },
            {
                name: "Roles",
                value: roles.length > 0 ? roles : "None or Unknown",
            },
        )
    }

    switch (type) {
        case MembershipChangeType.JOIN:
            embed.setTitle("Member Joined");
            embed.setColor("#00ff00");
            await channel.send({embeds: [embed]});
            break;
        case MembershipChangeType.LEAVE:
            embed.setTitle("Member Left");
            embed.setColor("#ff0000");
            await channel.send({embeds: [embed]});
            break;
    }
}
