import { connect } from 'mongoose';

import { DISCORD_DB_URL } from '../../../environments';

connect(DISCORD_DB_URL)
  .then(() => {
    console.log(`✔ ${DISCORD_DB_URL} mongoose connection successful`);
  })
  .catch((error) => {
    console.error(`${DISCORD_DB_URL} mongoose connection failed.`, error);
  });
