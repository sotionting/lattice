import { createBrowserRouter } from 'react-router-dom';
import AppLayout from '@/components/layout/AppLayout';
import Login from '@/pages/Login';
import NewChat from '@/pages/NewChat'; // 新对话页，含 TabBar
import Generate from '@/pages/Generate'; // 新生成页，含 TabBar
import Histories from '@/pages/Histories'; // 历史记录列表
import Generations from '@/pages/Generations'; // 生成记录瀑布流
import Resources from '@/pages/Resources';
import Tasks from '@/pages/Tasks';
import Profile from '@/pages/settings/Profile';
import Users from '@/pages/admin/Users';
import Models from '@/pages/admin/Models';
import Skills from '@/pages/admin/Skills';
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
      { index: true, element: <NewChat /> }, // 新对话页，含 TabBar
      { path: 'generate', element: <Generate /> }, // 新生成页，含 TabBar
      { path: 'histories', element: <Histories /> }, // 历史记录列表
      { path: 'generations', element: <Generations /> }, // 生成记录瀑布流
      { path: 'agent', element: <Agent /> },
      { path: 'resources', element: <Resources /> },
      { path: 'tasks', element: <Tasks /> },
      { path: 'settings/profile', element: <Profile /> },
      // 管理员
      { path: 'admin/users', element: <Users /> },
      { path: 'admin/models', element: <Models /> },
      { path: 'admin/skills', element: <Skills /> },
      // { path: 'admin/mcp', element: <MCP /> }, // 已删除 MCP 管理
      { path: 'admin/quota', element: <Quota /> },
    ],
  },
]);

export default router;
