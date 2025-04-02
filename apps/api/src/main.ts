import './config';
import './discord/bot';
import cors from 'cors';
import express from 'express';

import { API_BASE_PREFIX, API_PORT } from '@some-tools/shared/api/data-access';

import { discordRouter, discordServerMemberRouter } from './discord';
import { PRODUCTION } from './environments';
import { errorHandler, validateBearerApiKey } from './middleware';

const app = express();
app.use(express.json());
app.use(cors());
app.use(validateBearerApiKey);

/*
! If registered routes change, update urls used in libs/shared/api/data-access
TODO: How to sync the urls and url param ordering and insertion?
*/
const rootRouter = express.Router();
/*
Route params are undefined unless added with the HTTP verb methods, so they cannot be added at the `app.use` level.
:guildId is often not needed but it's included in the nested discord routers for consistency and in case of future use.
*/
discordRouter.use('/discord/guilds', discordServerMemberRouter);
rootRouter.use('', discordRouter);
rootRouter.get('/test', (_req, res) => {
  return res.json({ hello: 'world' });
});

app.use(`/${API_BASE_PREFIX}`, rootRouter);

// Must be last `app.use` to receive errors passed via next(error).
app.use(errorHandler);

const server = app.listen(API_PORT || 5050, () => {
  console.log(
    `✔ ${PRODUCTION ? 'PRODUCTION' : 'DEV'} api listening on port ${
      API_PORT || 5050
    } for requests to /${API_BASE_PREFIX}.`
  );
});
server.on('error', (error) => console.error('api main.ts error:', error));
