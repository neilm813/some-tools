import { alpha, Box, Typography } from '@mui/material';
import { Link } from 'react-router-dom';

import { messageFromError } from '@some-tools/shared/utils/common';

export const JoinError = ({ error }: { error: unknown }) => {
  console.log('JoinError', error);

  if (!error) {
    return null;
  }

  return (
    <Box
      sx={{
        backgroundColor: (theme) => alpha(theme.palette.background.paper, 0.9),
        borderColor: 'error.main',
        borderWidth: 2,
        borderStyle: 'solid',
        borderRadius: 2,
        p: 2,
      }}
    >
      <Typography color="error.main">
        {messageFromError(error)}
        <br></br>
        <Link style={{ color: 'lightblue' }} to="/join">
          Try again
        </Link>
      </Typography>
    </Box>
  );
};
