import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

import Layout from './components/layout/Layout';
import Home from './pages/Home';
import Calendario from './pages/Calendario';
import Familia from './pages/Familia';
import Foro from './pages/Foro';
import NotFound from './pages/NotFound';

const router = createBrowserRouter([
  {
    path: '*',
    element: <NotFound />,
  },
  {
    path: '/',
    element: <Layout />, 
    children: [
      {
        index: true, 
        element: <Home />,
      },
      {
        path: 'calendario',
        element: <Calendario />,
      },
      {
        path: 'familia',
        element: <Familia />,
      },
      {
        path: 'foro',
        element: <Foro />,
      },
    ],
  },
]);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Toaster 
        position="bottom-right" 
        toastOptions={{
          style: {
            background: '#1a202c',
            color: '#fff',
            borderRadius: '10px',
          }
        }} 
      />
    <RouterProvider router={router} />
  </StrictMode>
)
