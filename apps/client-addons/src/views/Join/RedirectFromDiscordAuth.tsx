import { CircularProgress, Container, Typography } from '@mui/material';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { serverMemberJoinGuildFromJoinPage } from '@some-tools/shared/api/data-access';
import {
  DISCORD_GUILD_ID, // TODO: remove this hard-coded id, save guild ids to db records
} from '@some-tools/shared/discord/some-bot/environments';
import { isOk } from '@some-tools/shared/utils/try-fail';

import { JoinError } from './JoinError';

/**
 * Discord redirects to this view after authorization is granted or not
 * via the `REACT_APP_DISCORD_OAUTH_URL` which contains the redirect url.
 * The url discord redirects back to is also set in the discord dev portal.
 *
 * @see [Discord Grant Flow](https://discordjs.guide/oauth2/#getting-an-oauth2-url)
 */
export const RedirectFromDiscordAuth = () => {
  // TODO: https://ultimatecourses.com/blog/query-strings-search-params-react-router
  const fragment = new URLSearchParams(window.location.hash.slice(1));
  const discordAccessToken = fragment.get('access_token');
  const discordTokenType = fragment.get('token_type');

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<unknown>(null);
  const navigate = useNavigate();

  useEffect(() => {
    // This shouldn't happen. If does, make sure `DISCORD_OAUTH_URL` has `response_type=token`
    if (!discordAccessToken || !discordTokenType) {
      setError(new Error('Missing discord token in url.'));
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const joinGuildByDiscordId = async () => {
      const result = await serverMemberJoinGuildFromJoinPage(
        { guildId: DISCORD_GUILD_ID },
        { discordAccessToken: discordAccessToken, discordTokenType: discordTokenType }
      );

      setLoading(false);

      if (isOk(result)) {
        setError(null);
        const joinedGuildUrl = result.value;
        return window.location.replace(joinedGuildUrl);
      }

      const fault = result.fault;

      if (fault._code === 'MEMBER_JOIN_EMAIL_NOT_FOUND') {
        return navigate(`/join/verify-email/${discordAccessToken}/${discordTokenType}`);
      }

      setError(fault);
    };
    joinGuildByDiscordId();
  }, [discordAccessToken, discordTokenType, navigate]);

  return (
    <Container sx={{ display: 'flex', justifyContent: 'center', pt: 15 }}>
      {loading && <CircularProgress color="secondary" size="5rem" />}
      <JoinError error={error} />
    </Container>
  );
};
