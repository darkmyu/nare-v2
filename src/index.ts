import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { Command } from '@/types/command';
import {
	Client as DiscordClient,
	ClientOptions,
	Collection,
	Events,
	GatewayIntentBits,
} from 'discord.js';

class Client extends DiscordClient {
	commands: Collection<string, Command> = new Collection();

	constructor(options: ClientOptions) {
		super(options);
	}
}

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

const foldersPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(foldersPath);

commandFolders.forEach((folder) => {
	const commandsPath = path.join(foldersPath, folder);
	const commandFiles = fs
		.readdirSync(commandsPath)
		.filter((file) => file.endsWith('.js') || file.endsWith('.ts'));

	commandFiles.forEach(async (file) => {
		const filePath = path.join(commandsPath, file);
		const command = await import(filePath);

		if ('data' in command && 'execute' in command) {
			client.commands.set(command.data.name, command);
		}
		else {
			console.log(
				`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`,
			);
		}
	});
});

client.on(Events.InteractionCreate, async (interaction) => {
	if (!interaction.isChatInputCommand()) return;

	const command = client.commands.get(interaction.commandName);

	if (!command) {
		console.error(`No command matching ${interaction.commandName} was found.`);
		return;
	}

	try {
		await command.execute(interaction);
	}
	catch (error) {
		console.error(error);
		if (interaction.replied || interaction.deferred) {
			await interaction.followUp({
				content: 'There was an error while executing this command!',
				ephemeral: true,
			});
		}
		else {
			await interaction.reply({
				content: 'There was an error while executing this command!',
				ephemeral: true,
			});
		}
	}
});

client.login(process.env.DISCORD_TOKEN);
