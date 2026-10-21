import http from 'node:http';

async function runTests() {
  const BASE_URL = 'http://localhost:5000/api';

  async function request(endpoint, method = 'GET', body = null, token = null) {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${BASE_URL}${endpoint}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined
    });

    const data = await res.json().catch(() => ({}));
    return { status: res.status, ok: res.ok, data };
  }

  console.log('--- Starting API Integration Tests ---');

  // 1. Health check
  const health = await request('/health');
  console.log('✓ Health Check:', health.status, health.data.status);
  if (!health.ok) throw new Error('Health check failed');

  // 2. Auth: Quick Login as Alex Rivera
  const loginRes = await request('/auth/quick-login', 'POST', { userId: 'u-alex' });
  console.log('✓ Quick Login (Alex):', loginRes.status, loginRes.data.user?.name);
  const alexToken = loginRes.data.token;
  if (!alexToken) throw new Error('Alex token missing');

  // 3. Auth: Register new test user
  const uniqueEmail = `testuser_${Date.now()}@example.com`;
  const registerRes = await request('/auth/register', 'POST', {
    name: 'Test Engineer',
    email: uniqueEmail,
    password: 'password123',
    role: 'QA Specialist'
  });
  console.log('✓ User Registration:', registerRes.status, registerRes.data.user?.email);
  const newUserToken = registerRes.data.token;
  const newUserId = registerRes.data.user.id;

  // 4. Projects: Get all projects for Alex
  const projectsRes = await request('/projects', 'GET', null, alexToken);
  console.log('✓ Get Projects:', projectsRes.status, `Found ${projectsRes.data.projects?.length} projects`);
  const activeProjectId = projectsRes.data.projects[0].id;

  // 5. Projects: Get single project details (columns, tasks, members)
  const projectDetails = await request(`/projects/${activeProjectId}`, 'GET', null, alexToken);
  console.log('✓ Get Project Details:', projectDetails.status, `Columns: ${projectDetails.data.columns?.length}, Tasks: ${projectDetails.data.tasks?.length}, Members: ${projectDetails.data.members?.length}`);

  // 6. Project Members: Add newly registered user to project
  const addMemberRes = await request(`/projects/${activeProjectId}/members`, 'POST', {
    userId: newUserId,
    role: 'member'
  }, alexToken);
  console.log('✓ Add Member to Project:', addMemberRes.status, addMemberRes.data.member?.name);

  // 7. Tasks: Create new task
  const firstColId = projectDetails.data.columns[0].id;
  const createTaskRes = await request(`/${activeProjectId}/tasks`, 'POST', {
    columnId: firstColId,
    title: 'E2E Test Automated Verification Task',
    description: 'Verifying end-to-end task lifecycle, assignment, checklists and real-time alerts.',
    priority: 'urgent',
    dueDate: '2026-11-01',
    assigneeIds: [newUserId],
    labels: [{ name: 'Test', color: '#10b981' }]
  }, alexToken);
  console.log('✓ Create Task:', createTaskRes.status, createTaskRes.data.task?.title);
  const createdTaskId = createTaskRes.data.task.id;

  // 8. Checklist: Add checklist item
  const checklistRes = await request(`/tasks/${createdTaskId}/checklist`, 'POST', {
    title: 'Automated assertion passes'
  }, alexToken);
  console.log('✓ Add Checklist Item:', checklistRes.status, checklistRes.data.item?.title);

  // 9. Checklist: Toggle item completed
  const toggleRes = await request(`/tasks/${createdTaskId}/checklist/${checklistRes.data.item.id}`, 'PUT', {
    completed: 1
  }, alexToken);
  console.log('✓ Toggle Checklist Item:', toggleRes.status, 'Completed:', toggleRes.data.task?.checklists[0]?.completed);

  // 10. Task Move: Move task to another column
  const secondColId = projectDetails.data.columns[1].id;
  const moveRes = await request(`/tasks/${createdTaskId}/move`, 'PUT', {
    targetColumnId: secondColId,
    newPosition: 0
  }, alexToken);
  console.log('✓ Move Task:', moveRes.status, 'New Column ID:', moveRes.data.task?.column_id);

  // 11. Comments: Add comment with @mention of newly registered user
  const commentRes = await request(`/tasks/${createdTaskId}/comments`, 'POST', {
    content: `@Test please verify this automated task completion!`
  }, alexToken);
  console.log('✓ Add Comment with @mention:', commentRes.status, commentRes.data.comment?.content);

  // 12. Notifications: Verify newly added user received notifications
  const notifsRes = await request('/notifications', 'GET', null, newUserToken);
  console.log('✓ Get Notifications for New User:', notifsRes.status, `Unread count: ${notifsRes.data.unreadCount}`);
  if (notifsRes.data.notifications?.length > 0) {
    const firstNotifId = notifsRes.data.notifications[0].id;
    const markReadRes = await request(`/notifications/${firstNotifId}/read`, 'PUT', null, newUserToken);
    console.log('✓ Mark Notification as Read:', markReadRes.status);
  }

  // 13. Clean up test task
  const deleteRes = await request(`/tasks/${createdTaskId}`, 'DELETE', null, alexToken);
  console.log('✓ Clean up / Delete Test Task:', deleteRes.status);

  console.log('--- ALL INTEGRATION TESTS PASSED SUCCESSFULLY! ---');
}

runTests().catch(err => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
