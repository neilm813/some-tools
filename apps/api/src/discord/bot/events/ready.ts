import { Events } from 'discord.js';

import { discordClient } from '../config';

discordClient.once(
  Events.ClientReady,
  /**
   * @see [docs](https://discord.js.org/#/docs/discord.js/14.5.0/class/Client?scrollTo=e-ready)
   */
  async () => {
    try {
      console.log('✔ discord bot ready event.');
    } catch (error) {
      console.error(error);
    }
  }
);
