import { StrictMode } from 'react';
import * as ReactDOM from 'react-dom/client';
import 'typeface-roboto';
import { BrowserRouter } from 'react-router-dom';

import App from './app';

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
root.render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>
);
