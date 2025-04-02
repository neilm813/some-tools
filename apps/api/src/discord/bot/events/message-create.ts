import { Events, inlineCode, type Message } from 'discord.js';

import { sendEventErrorToLogChannel } from '@some-tools/shared/discord/some-bot/data-access';
import { forwardDiscordEventToLearn } from '@some-tools/shared/discord/some-bot/data-access';

import { PRODUCTION } from '../../../environments';
import { discordClient } from '../config';

const deprecatedCommandReminder = async (message: Message) => {
  const c = message.content.trim().toLowerCase();

  if (!c.startsWith('some.')) {
    return;
  }

  const makeReminder = (newCommandName: string) =>
    `This command is deprecated, please use ${inlineCode(newCommandName)} and follow the prompts.`;
  let reminder = '';

  if (c.includes('.setcohort')) {
    reminder = makeReminder('/user update change-cohort');
  } else if (c.includes('.memberinfo')) {
    reminder = makeReminder('/user find one');
  } else if (c.includes('.addroles') || c.includes('.removeroles')) {
    reminder = makeReminder('/user update roles-add-or-remove');
  } else if (c.includes('.updatedbmember')) {
    reminder = makeReminder('/user update one');
  } else if (c.includes('addapprovedmembers')) {
    reminder = makeReminder('/user create');
  } else if (c.includes('.verifymember')) {
    reminder = makeReminder('/user update link-discord-account');
  } else if (c.includes('.resetverification')) {
    reminder = makeReminder('/user update unlink-discord-account');
  } else if (c.includes('.kick')) {
    reminder = makeReminder('/user update kick-many');
  } else if (c.includes('.postpone') || c.includes('.graduate')) {
    reminder = makeReminder('/user update roles-change-status');
  } else if (c.includes('.msgchannels')) {
    reminder = makeReminder('/message create send-to-each-channel');
  } else if (c.includes('.find')) {
    reminder = makeReminder('/user find many');
  }

  if (reminder) {
    await message.reply(reminder);
  }
};

discordClient.on(
  Events.MessageCreate,
  /**
   * @see [docs](https://discord.js.org/#/docs/discord.js/14.5.0/class/Client?scrollTo=e-messageCreate)
   */
  async (message) => {
    try {
      if (message.inGuild()) {
        forwardDiscordEventToLearn(PRODUCTION, message.guild, Events.MessageCreate, message).catch(() => null);
        await deprecatedCommandReminder(message);
      }
    } catch (error) {
      sendEventErrorToLogChannel(message.guild, Events.MessageCreate, error);
    }
  }
);
