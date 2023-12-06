import {DMChannel, Message, TextChannel} from "discord.js";

const { redis_host } = require('../config.json');
const redis = require('redis');
const { WebhookMessageBuilder } = require("discord.js")
const { serverid } = require('../config.json');

const redisClient = redis.createClient({
    url: redis_host,
});
redisClient.connect();

type GagType = {
    name: string,
    intensity: number,
    description: string,
}

interface GagTypeMap {
    [name: string]: GagType
}

export const gag_types: GagTypeMap = {
    "ballgag": {
        "name": "Ballgag",
        "intensity": 2,
        "description": "A simple ballgag, with a single strap around the head. Can't go wrong with the classics.",
    },
    "bitgag": {
        "name": "Bitgag",
        "intensity": 2,
        "description": "A bitgag, with a bar that goes between the teeth. For that extra bit of humiliation.",
    },
    "cleavegag": {
        "name": "Cleavegag",
        "intensity": 1,
        "description": "A cleavegag, with a strip of cloth tied around the head. Simple and not that effective.",
    },
    "ducttape": {
        "name": "Duct Tape",
        "intensity": 1,
        "description": "A strip of duct tape, wrapped around the head. Mediocre in terms of muffling, but very humiliating.",
    },
    "xlballgag": {
        "name": "XL Ballgag",
        "intensity": 3,
        "description": "A harness ballgag, but with a much larger ball. Very effective and uncomfortable.",
    },
    "ringgag": {
        "name": "Ring Gag",
        "intensity": 2,
        "description": "A ring gag, with a metal ring that goes between the teeth. Blocks speech only somewhat, but is very humiliating.",
    },
    "harness_gag": {
        "name": "Harness Gag",
        "intensity": 3,
        "description": "A harness gag, with a large ball and multiple straps. Very effective and uncomfortable.",
    },
}

async function getChannelWebhook(message: Message){
    let guild = await message.client.guilds.fetch(serverid);

    // Verify message is in a text channel
    if(!(message.channel instanceof TextChannel)) return;

    let webhooks = await message.channel.fetchWebhooks();

    let bondageWebhook = webhooks.find(webhook => webhook.name === "Bondage System");

    if (!bondageWebhook) {
        bondageWebhook = await message.channel.createWebhook({
            name: "Bondage System",
            avatar: "https://cdn.discordapp.com/avatars/1170406061828755536/4311f38f87426405c79f9653dbee65cc.webp",
            reason: "Bondage System"
        });
    }

    return bondageWebhook;
}

export async function bondage_handler(message: Message) {
    // Check if the message author is gagged
    let gagType = await redisClient.get(`gagged:${message.author.id}`);

    if (!gagType) {
        return;
    }

    await redisClient.set(`muffled_message:${message.id}`, true);

    const {gag_type, author} = JSON.parse(gagType);

    // Get the bondage webhook
    let bondageWebhook = await getChannelWebhook(message)
    if (!bondageWebhook) return;

    message.delete();

    bondageWebhook.send({
        username: message.author.displayName,
        avatarURL: message.author.avatarURL() || undefined,
        content: `_${message.author.displayName} mumbles through their ${gag_types[gag_type].name}._\n` + simulateGaggedSpeech(message.content, gag_types[gag_type].intensity) + "\n||" + message.content + "||",

        files: message.attachments.map(attachment => attachment.url),
    })


}

enum GagMuffleLevel {
    NONE = 0,
    MUFFLED = 1,
    MUFFLED_MORE = 2,
    MUFFLED_MOST = 3,
}

type Replacement = Record<string, string>;
type Replacements = Record<GagMuffleLevel, Replacement>;

function simulateGaggedSpeech(text: string, intensity: GagMuffleLevel): string {
    let muffledText = text;

    const replacements: Replacements = {
        [GagMuffleLevel.NONE]: {},
        [GagMuffleLevel.MUFFLED]: {
            a: 'ah', e: 'eh', i: 'ih', o: 'oh', u: 'uh',
            b: 'p', d: 't', g: 'k', v: 'f', z: 's',
            l: 'w', r: 'w', j: 'y', q: 'k', x: 'ks',
            c: 'k', h: 'h', w: 'u', f: 'ph', n: 'n'
        },
        [GagMuffleLevel.MUFFLED_MORE]: {
            a: 'uh', e: 'uh', i: 'uh', o: 'uh', u: 'uh',
            b: 'm', d: 'n', g: 'ng', v: 'f', z: 's',
            l: 'w', r: 'w', j: 'y', q: 'k', x: 'ks',
            c: 'k', h: 'h', w: 'u', f: 'ph', n: 'm'
        },
        [GagMuffleLevel.MUFFLED_MOST]: {
            a: 'm', e: 'm', i: 'm', o: 'm', u: 'm',
            b: 'm', d: 'n', g: 'n', v: 'f', z: 's',
            l: 'w', r: 'w', j: 'y', q: 'k', x: 'k',
            c: 'k', h: 'h', w: 'u', f: 'p', n: 'm'
        }
    };

    if (intensity === GagMuffleLevel.NONE) {
        return text;
    }

    const muffleChar = (char: string, replacements: Replacement): string => {
        const lowerChar = char.toLowerCase();
        return replacements.hasOwnProperty(lowerChar)
            ? (char === lowerChar ? replacements[lowerChar] : replacements[lowerChar].toUpperCase())
            : char;
    };

    for (let i = GagMuffleLevel.MUFFLED; i <= intensity; i++) {
        muffledText = muffledText.split('').map(char => muffleChar(char, replacements[i])).join('');
    }

    return muffledText;
}
