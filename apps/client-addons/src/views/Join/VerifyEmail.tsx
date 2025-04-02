import { alpha, Button, CircularProgress, Container, Grid, TextField } from '@mui/material';
import { useState } from 'react';
import { useParams } from 'react-router-dom';

import { serverMemberJoinGuildFromJoinPage } from '@some-tools/shared/api/data-access';
import { DISCORD_GUILD_ID } from '@some-tools/shared/discord/some-bot/environments';
import { isOk } from '@some-tools/shared/utils/try-fail';

import { JoinError } from './JoinError';

export const VerifyEmail = () => {
  const { discordAccessToken, discordTokenType } = useParams();

  const [someEnrollmentEmail, setSomeEnrollmentEmail] = useState<string>('');
  const [emailFormatError, setEmailFormatError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<unknown>(null);

  const handleJoinSubmit = async (e: React.SyntheticEvent): Promise<void> => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // This shouldn't happen.
    if (!discordAccessToken || !discordTokenType) {
      setError(new Error('Missing discord token in url.'));
      return;
    }

    const result = await serverMemberJoinGuildFromJoinPage(
      { guildId: DISCORD_GUILD_ID },
      {
        discordAccessToken: discordAccessToken,
        discordTokenType: discordTokenType,
        enrollmentEmail: someEnrollmentEmail,
      }
    );

    setLoading(false);

    if (isOk(result)) {
      const joinedGuildUrl = result.value;
      return window.location.replace(joinedGuildUrl);
    }

    setError(result.fault);
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const {
      target: { value },
    } = e;

    setSomeEnrollmentEmail(value);

    /** Bare-minimum email regex check. */
    const isFormatValid: boolean = /.+@.+\..+/.test(value);

    isFormatValid ? setEmailFormatError('') : setEmailFormatError('Please enter a valid email format.');
  };

  return (
    <Container sx={{ display: 'flex', justifyContent: 'center', pt: 20 }}>
      <Grid
        component="form"
        container
        spacing={0}
        noValidate
        onSubmit={handleJoinSubmit}
        sx={{
          backgroundColor: (theme) => alpha(theme.palette.background.paper, 0.8),
          borderColor: 'primary.dark',
          borderWidth: '2px',
          borderStyle: 'solid',
          borderRadius: 2,
          p: 2,
          width: { xs: '95%', md: '40%' },
          boxShadow: 5,
        }}
      >
        <Grid hidden={!error} item xs={12} md={12} sx={{ mb: 3 }}>
          <JoinError error={error} />
        </Grid>
        <Grid item xs={12} md={12}>
          <TextField
            autoFocus
            fullWidth
            type="email"
            id="join-enrollment-email"
            label="Enrollment Email"
            variant="outlined"
            error={Boolean(emailFormatError)}
            helperText={emailFormatError}
            onChange={handleEmailChange}
            sx={{ mb: 2 }}
          />
        </Grid>
        <Grid container item xs={12} md={12} justifyContent="center">
          <Button
            disabled={Boolean(emailFormatError)}
            variant="contained"
            type="submit"
            sx={{
              backgroundColor: 'primary.dark',
              '&:hover': {
                backgroundColor: 'primary.main',
              },
            }}
          >
            Submit
            {loading && <CircularProgress color="inherit" sx={{ ml: '5px' }} size="1.5rem" />}
          </Button>
        </Grid>
      </Grid>
    </Container>
  );
};
