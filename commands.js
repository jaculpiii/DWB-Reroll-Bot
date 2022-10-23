import { capitalize, DiscordRequest } from './utils.js';

export async function HasGuildCommands(appId, guildId, commands) {
  if (guildId === '' || appId === '') return;

  commands.forEach((c) => HasGuildCommand(appId, guildId, c));
}

// Checks for a command
async function HasGuildCommand(appId, guildId, command) {
  // API endpoint to get and post guild commands
  const endpoint = `applications/${appId}/guilds/${guildId}/commands`;

  try {
    const res = await DiscordRequest(endpoint, { method: 'GET' });
    const data = await res.json();

    if (data) {
      const installedNames = data.map((c) => c['name']);
      // This is just matching on the name, so it's not good for updates
      if (!installedNames.includes(command['name'])) {
        console.log(`Installing "${command['name']}"`);
        InstallGuildCommand(appId, guildId, command);
      } else {
        console.log(`"${command['name']}" command already installed`);
      }
    }
  } catch (err) {
    console.error(err);
  }
}

// Installs a command
export async function InstallGuildCommand(appId, guildId, command) {
  // API endpoint to get and post guild commands
  const endpoint = `applications/${appId}/guilds/${guildId}/commands`;
  // install command
  try {
    await DiscordRequest(endpoint, { method: 'POST', body: command });
  } catch (err) {
    console.error(err);
  }
}

// reroll / rr commands
export const RR_COMMAND = {
  name: 'rr',
  description: 'Use a single reroll token',
  type: 1,
}

// reroll / rr commands
export const REROLL_COMMAND = {
  name: 'reroll',
  description: 'Use a single reroll token',
  type: 1,
}

// bal command
export const BAL_COMMAND = {
  name: 'bal',
  description: 'Show how many rerolls you have left',
  type: 1,
}

// add command
export const ADD_COMMAND = {
  name: 'add',
  description: 'Add reroll tokens',
  options: [
    {
      type: 4,
      name: 'quantity',
      description: 'How Many?',
      required: true,
    },
    {
      type: 9,
      name: 'user',
      description: 'Who?',
      required: true,
    }
  ],
  type: 1,
}

// reset command
export const RESET_COMMAND = {
  name: 'reset',
  description: 'Completely wipe the reroll database',
  options: [
    {
      type: 3,
      name: 'confirm',
      description: 'This wipes the entire database, ARE YOU SURE?',
      required: true,
      choices: [
        { name: "Yes", value: "1" },
        { name: "No", value: "0" }
      ],
    },
  ],
  type: 1,
}
