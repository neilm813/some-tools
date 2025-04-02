import {
  type CacheType,
  ChatInputCommandInteraction,
  type Interaction,
  REST,
  type RESTPostAPIChatInputApplicationCommandsJSONBody,
  Routes,
  type Snowflake,
} from 'discord.js';

import type { DiscordSlashCommandSetupFault } from '@some-tools/shared/discord/types';
import { makeUnidentifiedFault, messageFromError } from '@some-tools/shared/utils/common';
import { fail, isFail, Result, tryFailAsync } from '@some-tools/shared/utils/try-fail';

import type { ModularSlashSubcommand, SlashCommands } from './make-commands';

import {
  makeSlashCommandNotFoundFault,
  makeSlashCommandSetupFault,
  mapRunChatInteractionErrors,
  type RunChatInteractionFault,
} from '../error-handling';
import { formatSimpleError } from '../formatters';

/*
`.deferReply()` can be used with components (like buttons) in messages but can't be used with `.showModal`
On error code `InteractionCollectorError` with modal -                   replied: true, deferred: false
On error code `InteractionCollectorError` without modal (buttons only) - replied: true, deferred true | false
*/
const tryReplyWithError = async (errorMessage: string, interaction: ChatInputCommandInteraction<CacheType>) => {
  const { channel, deferred, replied } = interaction;
  console.log('tryReplyWithError:', 'deferred:', deferred, 'replied:', replied);

  const formattedError = formatSimpleError(errorMessage);

  const result = await tryFailAsync(async () => {
    if (interaction.isRepliable()) {
      if (!replied && !deferred) {
        return interaction.reply(formattedError);
      }

      if (deferred) {
        return interaction.editReply({ content: formattedError, components: [] });
      }

      // replied && !deferred
      return interaction.followUp(formattedError);
    } else {
      const unrepliableErrorMessage = `Interaction is not repliable - Error: ${errorMessage}`;

      if (channel) {
        await channel.send(formatSimpleError(unrepliableErrorMessage));
      }
      throw new Error(unrepliableErrorMessage);
    }
  }, makeUnidentifiedFault);

  if (isFail(result)) {
    console.log('Failed to reply to interaction with error:', result.fault);
  }

  return result;
};

type ExecuteChatInputCommandUtilFault = RunChatInteractionFault | DiscordSlashCommandSetupFault;

const tryExecuteChatInputCommand = async (
  modularSubcommand: ModularSlashSubcommand,
  interaction: ChatInputCommandInteraction<CacheType>
): Promise<Result<unknown, ExecuteChatInputCommandUtilFault>> => {
  if (modularSubcommand.runChatInputCommand) {
    return tryFailAsync(() => modularSubcommand.runChatInputCommand(interaction), mapRunChatInteractionErrors);
  }

  if (interaction.inCachedGuild()) {
    return tryFailAsync(
      () => modularSubcommand.runChatInputCommandInCachedGuild(interaction),
      mapRunChatInteractionErrors
    );
  }
  // This shouldn't happen because it's already validated in `make-commands`.
  return fail(makeSlashCommandSetupFault("Slash command is missing a handler for 'in cached guild'."));
};

const findChatInputCommand = async (
  interaction: ChatInputCommandInteraction<CacheType>,
  slashCommands: SlashCommands
) => {
  return await tryFailAsync(
    async () => {
      const { commandName, options } = interaction;
      const modularSlashCommand = slashCommands.get(commandName);

      if (!modularSlashCommand) {
        // This shouldn't be able to happen because a the commands are deployed from the same `slashCommands` param.
        const errorMessage = `${commandName} slash command not found.`;
        throw new Error(errorMessage);
      }

      const subcommandGroupName = options.getSubcommandGroup(true);
      const subcommandName = options.getSubcommand(true);

      if (subcommandGroupName in modularSlashCommand.groupedSubcommands) {
        const modularSubcommandGroup = modularSlashCommand.groupedSubcommands[subcommandGroupName];

        if (subcommandName in modularSubcommandGroup.subcommands) {
          const modularSubcommand = modularSubcommandGroup.subcommands[subcommandName];
          return modularSubcommand;
        } else {
          const errorMessage = `Subcommand ${subcommandName} not found in subcommand group ${subcommandGroupName}.`;
          throw new Error(errorMessage);
        }
      } else {
        const errorMessage = `Subcommand group ${subcommandGroupName} not found in ${commandName}.`;
        throw new Error(errorMessage);
      }
    },
    (error) => (error instanceof Error ? makeSlashCommandNotFoundFault(error.message) : makeUnidentifiedFault(error))
  );
};

/*
`interaction.inCachedGuild()`
  - only false if the bot is not in the guild (kicked) or the `guilds` intent in discord-client.ts is missing or the
      `bots` scope is missing from the bot invite-to-guild link.
  - `interactionCreate` can still trigger if the bot is not in the guild but the guild won't be in cached guilds

`guildDelete` event is fired both if the bot is kicked or the guild is deleted
  - Can delete slash commands for a particular guild if `guildDelete` is fired
*/
export const runSlashCommand = async (
  interaction: Interaction<CacheType>,
  slashCommands: SlashCommands
): Promise<void> => {
  if (interaction.isModalSubmit()) {
    // This isn't setup to handle modal submissions, they should be handled within the slash command itself.
    return;
  }

  if (!interaction.isChatInputCommand()) {
    console.log("runSlashCommand: The bot isn't setup to handle non-chat input commands!");
    return;
  }

  try {
    const findCommandResult = await findChatInputCommand(interaction, slashCommands);

    if (isFail(findCommandResult)) {
      await tryReplyWithError(findCommandResult.fault.message, interaction);
      return;
    }

    const executedCommandResult = await tryExecuteChatInputCommand(findCommandResult.value, interaction);

    if (isFail(executedCommandResult)) {
      console.log('runSlashCommand:', executedCommandResult.fault.message);
      await tryReplyWithError(executedCommandResult.fault.message, interaction);
    }
  } catch (error) {
    const errorMessage = messageFromError(error);
    console.error('Caught error from slash command:', error);

    try {
      await tryReplyWithError(errorMessage, interaction);
    } catch (error) {
      console.log('Error when slash command tried to reply with an error:', error);
    }
  }
};

interface ConfigureDeployedCommands {
  isProduction: boolean;
  /** Discord bot client id. */
  clientId: string;
  /** Discord bot token. */
  token: string;
  guildId: Snowflake;
  slashCommands: SlashCommands;
}

/**
 * Deploys and updates slash commands in the dev guild only or for production in all guilds the bot has joined.
 * @see [Discord.js deploy commands docs](https://discordjs.guide/creating-your-bot/command-deployment.html#guild-commands)
 *
 * ! `applicationCommands` deploys commands to all guilds the bot is in (and is needed for DM-based slash commands)
 * ! `applicationGuildCommands` deploys commands to only the specified guild.
 * ! If both were used to deploy commands, the discord GUI will show the commands twice, and one version could be
 * ! outdated if commands were updated using only one of the methods above.
 * ! use `body: null` to clear commands.
 * ! The bot is currently only connected to one guild and commands were originally deployed in prod with
 * ! `applicationGuildCommands` so it's still used to avoid the commands appearing twice and having to clear them.
 */
export const deploySlashCommands = async (configuration: ConfigureDeployedCommands) => {
  const { isProduction, clientId, token, guildId, slashCommands } = configuration;
  const jsonCommands: RESTPostAPIChatInputApplicationCommandsJSONBody[] = [];

  for (const [commandName, modularSlashCommand] of slashCommands) {
    try {
      jsonCommands.push(modularSlashCommand.builder.toJSON());
    } catch (error) {
      console.log('Deploying commands aborted:');
      console.error(`${commandName} command validation error:`, error);
      return;
    }
  }

  const rest = new REST({ version: '10' }).setToken(token);
  const successfullyDeployedMessage = `\n✔ ${
    isProduction ? 'Production' : 'Development'
  } slash commands have been deployed.\n🟡 Disable the 'DISCORD_SHOULD_DEPLOY_COMMANDS' environment variable until needed again.\nTo update command permissions: Server Settings -> Integrations -> Select the bot.\n`;

  try {
    if (isProduction) {
      // If prod commands appear twice, uncomment the line below for one deployment.
      // await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: [] });
      await rest.put(Routes.applicationCommands(clientId), { body: jsonCommands });
      console.log(successfullyDeployedMessage);
    }
    // DEV: Extra safety to make sure prod guild id wasn't accidentally passed in to dev command deployment
    else if (guildId !== '738494436467539968') {
      console.log('Deploying commands - request sent');
      // If your dev commands appear twice, uncomment the line below for one deployment.
      // await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: [] });
      await rest.put(Routes.applicationCommands(clientId), { body: jsonCommands });
      console.log(successfullyDeployedMessage);
    }
  } catch (error) {
    console.error('Discord API Error deploying commands:', error);
  }
};
