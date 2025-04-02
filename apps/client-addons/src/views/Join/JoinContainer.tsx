import { Box, Fade } from '@mui/material';
import { Outlet } from 'react-router-dom';

import { brandImages } from '../../assets/images';

export const JoinContainer = () => {
  /**
   * Emergency bypass to join the some server directly then the bot will DM asking for their email to link accounts.
   */
  // return window.location.replace("http://discord.gg/ZBWaDuSyqw");
  return (
    <Fade in timeout={1000}>
      <Box
        sx={{
          backgroundImage: `url(${brandImages.mission})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          height: '100vh',
        }}
      >
        {/* The sub-join view to display inside the bg image <Box> */}
        <Outlet />
      </Box>
    </Fade>
  );
};
