import { CircularProgress, Grid } from '@mui/material';
import { useEffect } from 'react';

import { DISCORD_OAUTH_URL } from '@some-tools/shared/discord/some-bot/environments';

export const JoinHome = () => {
  useEffect(() => {
    const timeout = setTimeout(() => {
      window.location.replace(DISCORD_OAUTH_URL);
    }, 1000);

    return (): void => clearTimeout(timeout);
  }, []);

  return (
    <Grid container spacing={0} justifyContent="center" alignItems="center" direction="column" height="100vh">
      <Grid item mb="5rem">
        <CircularProgress color="secondary" size="5rem" />
      </Grid>
    </Grid>
  );
};
