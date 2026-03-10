import { createBrowserRouter } from 'react-router-dom';
import AppLayout from '@/components/layout/AppLayout';
import Login from '@/pages/Login';
import Chat from '@/pages/Chat';
import Conversations from '@/pages/Conversations';
import Resources from '@/pages/Resources';
import Tasks from '@/pages/Tasks';
import Profile from '@/pages/settings/Profile';
import Users from '@/pages/admin/Users';
import Models from '@/pages/admin/Models';
import Skills from '@/pages/admin/Skills';
import MCP from '@/pages/admin/MCP';
import Quota from '@/pages/admin/Quota';
import Agent from '@/pages/Agent';

const router = createBrowserRouter([
  {
    path: '/login',
    element: <Login />,
  },
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <Chat /> },
      { path: 'conversations', element: <Conversations /> },
      { path: 'agent', element: <Agent /> },
      { path: 'resources', element: <Resources /> },
      { path: 'tasks', element: <Tasks /> },
      { path: 'settings/profile', element: <Profile /> },
      // 管理员
      { path: 'admin/users', element: <Users /> },
      { path: 'admin/models', element: <Models /> },
      { path: 'admin/skills', element: <Skills /> },
      { path: 'admin/mcp', element: <MCP /> },
      { path: 'admin/quota', element: <Quota /> },
    ],
  },
]);

export default router;
