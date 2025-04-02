import { Outlet } from 'react-router-dom';

import { TopAppBar } from '../../components/TopAppBar';

export const Layout = () => {
  return (
    <>
      <TopAppBar position={'sticky'} />
      {/* The active view. */}
      <Outlet />
    </>
  );
};
