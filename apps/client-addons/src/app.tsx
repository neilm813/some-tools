import { CssBaseline, ThemeProvider } from '@mui/material';
import { Navigate, Route, Routes } from 'react-router-dom';

import styles from './app.module.css'; // eslint-disable-line @typescript-eslint/no-unused-vars
import { theme } from './theme';
import { Home, JoinContainer, JoinHome, Layout, RedirectFromDiscordAuth, VerifyEmail } from './views';

export function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />

          <Route path="join" element={<JoinContainer />}>
            <Route path="verify-email/:discordAccessToken/:discordTokenType" element={<VerifyEmail />} />
            <Route path="redirect/*" element={<RedirectFromDiscordAuth />} />
            <Route index element={<JoinHome />} />
          </Route>

          <Route path="*" element={<Navigate to="join" />} />
        </Route>
      </Routes>
    </ThemeProvider>
  );
}

export default App;
