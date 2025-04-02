import { Box } from '@mui/material';

import { brandImages } from '../../assets/images';

export const Home = () => {
  return (
    <Box
      sx={{
        backgroundImage: `url(${brandImages.floatingOfficeGif})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        height: '100vh',
      }}
    />
  );
};
