import db from './database.js';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

export async function seedDatabase() {
  const userCount = db.prepare('SELECT count(*) as count FROM users').get().count;
  if (userCount > 0) {
    console.log('Database already seeded. Skipping seed.');
    return;
  }

  console.log('Seeding initial data...');
  const passwordHash = await bcrypt.hash('password123', 10);

  // 1. Create Users
  const users = [
    {
      id: 'u-alex',
      name: 'Alex Rivera',
      email: 'alex@example.com',
      avatar_color: '#4f46e5', // Indigo
      role: 'Product Lead'
    },
    {
      id: 'u-sarah',
      name: 'Sarah Chen',
      email: 'sarah@example.com',
      avatar_color: '#059669', // Emerald
      role: 'Tech Lead & Architect'
    },
    {
      id: 'u-marcus',
      name: 'Marcus Scott',
      email: 'marcus@example.com',
      avatar_color: '#d97706', // Amber
      role: 'Frontend Engineer'
    },
    {
      id: 'u-elena',
      name: 'Elena Rostova',
      email: 'elena@example.com',
      avatar_color: '#db2777', // Pink
      role: 'UI/UX Designer'
    },
    {
      id: 'u-david',
      name: 'David Kim',
      email: 'david@example.com',
      avatar_color: '#0891b2', // Cyan
      role: 'DevOps & Cloud'
    }
  ];

  const insertUser = db.prepare(`
    INSERT INTO users (id, name, email, password_hash, avatar_color, role)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  for (const u of users) {
    insertUser.run(u.id, u.name, u.email, passwordHash, u.avatar_color, u.role);
  }

  // 2. Create Projects
  const projects = [
    {
      id: 'p-mobile-app',
      name: 'Mobile App 2.0 Redesign',
      description: 'Next-gen iOS & Android mobile application with real-time sync, dark mode, and offline caching.',
      color: '#6366f1',
      owner_id: 'u-alex'
    },
    {
      id: 'p-cloud-infra',
      name: 'Cloud Infrastructure & Kubernetes',
      description: 'Migrating legacy monolith into scalable microservices cluster with automated CI/CD pipelines.',
      color: '#0891b2',
      owner_id: 'u-david'
    },
    {
      id: 'p-design-system',
      name: 'Unified Design System (Tokens & Figma)',
      description: 'Comprehensive cross-platform design token architecture, component library, and accessible color palettes.',
      color: '#ec4899',
      owner_id: 'u-elena'
    }
  ];

  const insertProject = db.prepare(`
    INSERT INTO projects (id, name, description, color, owner_id)
    VALUES (?, ?, ?, ?, ?)
  `);

  const insertMember = db.prepare(`
    INSERT INTO project_members (id, project_id, user_id, role)
    VALUES (?, ?, ?, ?)
  `);

  for (const p of projects) {
    insertProject.run(p.id, p.name, p.description, p.color, p.owner_id);
    // Add all 5 users to the mobile app project
    for (const u of users) {
      const memberRole = u.id === p.owner_id ? 'owner' : (u.id === 'u-sarah' ? 'admin' : 'member');
      insertMember.run(uuidv4(), p.id, u.id, memberRole);
    }
  }

  // 3. Create Columns for "Mobile App 2.0 Redesign"
  const columnsData = [
    { id: 'col-backlog', name: 'Backlog', position: 0, color: '#64748b' },
    { id: 'col-todo', name: 'To Do', position: 1, color: '#3b82f6' },
    { id: 'col-inprogress', name: 'In Progress', position: 2, color: '#f59e0b' },
    { id: 'col-review', name: 'In Review', position: 3, color: '#8b5cf6' },
    { id: 'col-done', name: 'Completed', position: 4, color: '#10b981' }
  ];

  const insertColumn = db.prepare(`
    INSERT INTO columns (id, project_id, name, position, color)
    VALUES (?, ?, ?, ?, ?)
  `);

  for (const col of columnsData) {
    insertColumn.run(col.id, 'p-mobile-app', col.name, col.position, col.color);
  }

  // Add default columns for other projects as well
  for (const p of ['p-cloud-infra', 'p-design-system']) {
    insertColumn.run(uuidv4(), p, 'Backlog', 0, '#64748b');
    insertColumn.run(uuidv4(), p, 'In Progress', 1, '#f59e0b');
    insertColumn.run(uuidv4(), p, 'Completed', 2, '#10b981');
  }

  // 4. Create Tasks for Mobile App Project
  const now = new Date();
  const formatFutureDate = (days) => {
    const d = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
    return d.toISOString().split('T')[0];
  };

  const tasksData = [
    {
      id: 'task-1',
      project_id: 'p-mobile-app',
      column_id: 'col-inprogress',
      title: 'Implement WebSocket Real-Time Synchronization',
      description: 'Set up bi-directional event bus using Socket.IO for live board changes, presence indicators, and task updates without page refresh.',
      priority: 'urgent',
      due_date: formatFutureDate(2),
      position: 0,
      created_by: 'u-sarah',
      assignees: ['u-sarah', 'u-marcus'],
      labels: [{ name: 'Backend', color: '#6366f1' }, { name: 'WebSocket', color: '#06b6d4' }],
      checklists: [
        { title: 'Define room naming structure for projects & tasks', completed: 1 },
        { title: 'Implement reconnect retry backoff', completed: 1 },
        { title: 'Add active viewer presence count', completed: 0 },
        { title: 'Benchmark high-load payload broadcasting', completed: 0 }
      ]
    },
    {
      id: 'task-2',
      project_id: 'p-mobile-app',
      column_id: 'col-inprogress',
      title: 'Design Dark Mode Color Palette & Component Tokens',
      description: 'Create high contrast accessible dark mode variables conforming to WCAG AAA standards across all forms, modals, and kanban cards.',
      priority: 'high',
      due_date: formatFutureDate(3),
      position: 1,
      created_by: 'u-elena',
      assignees: ['u-elena'],
      labels: [{ name: 'UI/UX', color: '#ec4899' }, { name: 'Accessibility', color: '#10b981' }],
      checklists: [
        { title: 'Audit current background contrast ratios', completed: 1 },
        { title: 'Produce Figma token spec', completed: 1 },
        { title: 'Export Tailwind color utility overrides', completed: 0 }
      ]
    },
    {
      id: 'task-3',
      project_id: 'p-mobile-app',
      column_id: 'col-todo',
      title: 'Drag and Drop Kanban Reordering with Optimistic UI',
      description: 'Support smooth horizontal column movement and vertical card reordering with optimistic client updates and server position recalculation.',
      priority: 'high',
      due_date: formatFutureDate(5),
      position: 0,
      created_by: 'u-alex',
      assignees: ['u-marcus'],
      labels: [{ name: 'Frontend', color: '#f59e0b' }, { name: 'UX', color: '#8b5cf6' }],
      checklists: [
        { title: 'Integrate @hello-pangea/dnd context', completed: 1 },
        { title: 'Handle cross-column drops gracefully', completed: 0 },
        { title: 'Add animated drop placeholder', completed: 0 }
      ]
    },
    {
      id: 'task-4',
      project_id: 'p-mobile-app',
      column_id: 'col-review',
      title: 'JWT Authentication & Session Refresh Flow',
      description: 'Add secure token issuance, auth headers, protected API middleware, and graceful token expiry handling.',
      priority: 'medium',
      due_date: formatFutureDate(1),
      position: 0,
      created_by: 'u-alex',
      assignees: ['u-sarah'],
      labels: [{ name: 'Security', color: '#ef4444' }, { name: 'Backend', color: '#6366f1' }],
      checklists: [
        { title: 'Argon2/bcrypt password hashing', completed: 1 },
        { title: 'JWT token signing and verification', completed: 1 },
        { title: 'Route guard middleware', completed: 1 }
      ]
    },
    {
      id: 'task-5',
      project_id: 'p-mobile-app',
      column_id: 'col-done',
      title: 'Initial Database Architecture & Schema Design',
      description: 'Designed normalized relational schema with SQLite, indexing on hot foreign keys, and foreign key cascade rules.',
      priority: 'high',
      due_date: formatFutureDate(-2),
      position: 0,
      created_by: 'u-sarah',
      assignees: ['u-sarah', 'u-david'],
      labels: [{ name: 'Database', color: '#10b981' }],
      checklists: [
        { title: 'Draft entity relationship diagram', completed: 1 },
        { title: 'Set up migration/seed runner', completed: 1 },
        { title: 'Validate cascade deletes on project cleanup', completed: 1 }
      ]
    },
    {
      id: 'task-6',
      project_id: 'p-mobile-app',
      column_id: 'col-backlog',
      title: 'Push Notifications & Email Digest Service',
      description: 'Allow team members to subscribe to instant task mentions or daily digest summaries.',
      priority: 'low',
      due_date: formatFutureDate(14),
      position: 0,
      created_by: 'u-alex',
      assignees: ['u-david'],
      labels: [{ name: 'Notification', color: '#3b82f6' }],
      checklists: [
        { title: 'Draft email notification templates', completed: 0 },
        { title: 'Implement web push service worker', completed: 0 }
      ]
    }
  ];

  const insertTask = db.prepare(`
    INSERT INTO tasks (id, project_id, column_id, title, description, priority, due_date, position, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertAssignee = db.prepare(`
    INSERT INTO task_assignees (id, task_id, user_id)
    VALUES (?, ?, ?)
  `);

  const insertLabel = db.prepare(`
    INSERT INTO task_labels (id, task_id, name, color)
    VALUES (?, ?, ?, ?)
  `);

  const insertChecklist = db.prepare(`
    INSERT INTO task_checklists (id, task_id, title, completed, position)
    VALUES (?, ?, ?, ?, ?)
  `);

  for (const t of tasksData) {
    insertTask.run(t.id, t.project_id, t.column_id, t.title, t.description, t.priority, t.due_date, t.position, t.created_by);

    for (const uId of t.assignees) {
      insertAssignee.run(uuidv4(), t.id, uId);
    }

    for (const l of t.labels) {
      insertLabel.run(uuidv4(), t.id, l.name, l.color);
    }

    t.checklists.forEach((c, idx) => {
      insertChecklist.run(uuidv4(), t.id, c.title, c.completed, idx);
    });
  }

  // 5. Create Comments
  const commentsData = [
    {
      task_id: 'task-1',
      user_id: 'u-sarah',
      content: 'I have set up the basic Socket.IO server room events. Client can join `project:${projectId}` to receive immediate board mutations.'
    },
    {
      task_id: 'task-1',
      user_id: 'u-marcus',
      content: 'Awesome! Connecting the React state updater now so drag operations broadcast optimistic updates instantly to other connected users.'
    },
    {
      task_id: 'task-2',
      user_id: 'u-elena',
      content: 'Shared the preview link to the Figma color tokens. Let me know if the contrast on `#6366f1` needs tweaking.'
    },
    {
      task_id: 'task-2',
      user_id: 'u-alex',
      content: 'Looks crisp! Let us ensure we have tested it on OLED screens.'
    }
  ];

  const insertComment = db.prepare(`
    INSERT INTO comments (id, task_id, user_id, content)
    VALUES (?, ?, ?, ?)
  `);

  for (const c of commentsData) {
    insertComment.run(uuidv4(), c.task_id, c.user_id, c.content);
  }

  // 6. Create Notifications
  const notificationsData = [
    {
      user_id: 'u-alex',
      type: 'comment_added',
      title: 'New comment from Sarah',
      message: 'Sarah commented on "Implement WebSocket Real-Time Synchronization"',
      data: JSON.stringify({ projectId: 'p-mobile-app', taskId: 'task-1' }),
      read: 0
    },
    {
      user_id: 'u-alex',
      type: 'task_assigned',
      title: 'Task Assigned',
      message: 'You were assigned to "Design Dark Mode Color Palette"',
      data: JSON.stringify({ projectId: 'p-mobile-app', taskId: 'task-2' }),
      read: 1
    },
    {
      user_id: 'u-sarah',
      type: 'task_assigned',
      title: 'New Task Assignment',
      message: 'You have been assigned to "JWT Authentication & Session Refresh Flow"',
      data: JSON.stringify({ projectId: 'p-mobile-app', taskId: 'task-4' }),
      read: 0
    }
  ];

  const insertNotification = db.prepare(`
    INSERT INTO notifications (id, user_id, type, title, message, data, read)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  for (const n of notificationsData) {
    insertNotification.run(uuidv4(), n.user_id, n.type, n.title, n.message, n.data, n.read);
  }

  // 7. Activity Log
  const activitiesData = [
    {
      project_id: 'p-mobile-app',
      user_id: 'u-alex',
      action: 'created_project',
      details: JSON.stringify({ name: 'Mobile App 2.0 Redesign' })
    },
    {
      project_id: 'p-mobile-app',
      user_id: 'u-sarah',
      action: 'created_task',
      details: JSON.stringify({ taskTitle: 'Implement WebSocket Real-Time Synchronization', column: 'In Progress' })
    },
    {
      project_id: 'p-mobile-app',
      user_id: 'u-elena',
      action: 'added_comment',
      details: JSON.stringify({ taskTitle: 'Design Dark Mode Color Palette' })
    }
  ];

  const insertActivity = db.prepare(`
    INSERT INTO activities (id, project_id, user_id, action, details)
    VALUES (?, ?, ?, ?, ?)
  `);

  for (const a of activitiesData) {
    insertActivity.run(uuidv4(), a.project_id, a.user_id, a.action, a.details);
  }

  console.log('Database successfully seeded with realistic sample project!');
}
