// End-to-end API check against a RUNNING backend. Usage:
//   local:      npm run test:api                       (backend must be running on port 5000)
//   deployed:   API_URL=https://your-api.onrender.com npm run test:api
// Needs Node 18+. It creates one test mine, one reading, one grievance and one test user, and cleans up what it can.
const BASE = (process.env.API_URL || 'http://localhost:' + (process.env.PORT || 5000)).replace(/\/+$/, '').replace(/\/api$/, '') + '/api';
let pass = 0, fail = 0;
const t = async (name, fn) => { try { await fn(); pass++; console.log('  PASS  ' + name); } catch (e) { fail++; console.log('  FAIL  ' + name + '  ->  ' + e.message); } };
const eq = (a, b, m) => { if (a !== b) throw new Error(`${m || 'expected'} ${JSON.stringify(b)} but got ${JSON.stringify(a)}`); };
async function call(path, { method = 'GET', body, token } = {}) {
  const r = await fetch(BASE + path, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const text = await r.text(); let data; try { data = JSON.parse(text); } catch { data = text; }
  return { status: r.status, data };
}
const login = async (email, password) => { const r = await call('/auth/login', { method: 'POST', body: { email, password } }); eq(r.status, 200, 'login status'); return r.data; };

(async () => {
  console.log('Testing ' + BASE);
  let admin, op, insp, mineId, newToken, alertId;
  const stamp = Date.now();
  await t('health: server and database are up', async () => { const r = await call('/health'); eq(r.status, 200, 'status'); eq(r.data.database.status, 'ready', 'db'); console.log('        database mode: ' + r.data.database.mode); });
  await t('public stats load', async () => { const r = await call('/public/stats'); eq(r.status, 200); if (typeof r.data.mines !== 'number') throw new Error('no mines count'); });
  await t('admin login (role admin, token returned)', async () => { admin = await login('admin@coal.gov', 'Admin@123'); eq(admin.user.role, 'admin'); if (!admin.token) throw new Error('no token'); if (admin.user.password) throw new Error('password leaked'); });
  await t('operator login (role operator)', async () => { op = await login('operator@coal.gov', 'Operator@123'); eq(op.user.role, 'operator'); });
  await t('inspector login (role inspector)', async () => { insp = await login('inspector@coal.gov', 'Inspector@123'); eq(insp.user.role, 'inspector'); });
  await t('wrong password is rejected (401)', async () => { eq((await call('/auth/login', { method: 'POST', body: { email: 'admin@coal.gov', password: 'nope' } })).status, 401); });
  await t('protected route without token is rejected (401)', async () => eq((await call('/mines')).status, 401));
  await t('forged token is rejected (401)', async () => eq((await call('/mines', { token: 'abc.def.ghi' })).status, 401));
  await t('GET /auth/me returns the logged-in user', async () => { const r = await call('/auth/me', { token: admin.token }); eq(r.status, 200); eq(r.data.email, 'admin@coal.gov'); });
  await t('registration creates an account and logs in', async () => { const r = await call('/auth/register', { method: 'POST', body: { name: 'Smoke Tester', email: `smoke${stamp}@test.in`, password: 'Test@1234', role: 'operator', organisation: 'Test' } }); eq(r.status, 201); newToken = r.data.token; });
  await t('registering the same email again is refused (409)', async () => eq((await call('/auth/register', { method: 'POST', body: { name: 'Dup', email: `smoke${stamp}@test.in`, password: 'Test@1234', role: 'operator' } })).status, 409));
  await t('self-registering as admin is refused (400)', async () => eq((await call('/auth/register', { method: 'POST', body: { name: 'Evil', email: `evil${stamp}@test.in`, password: 'Test@1234', role: 'admin' } })).status, 400));
  await t('new account can log in again', async () => { const r = await login(`smoke${stamp}@test.in`, 'Test@1234'); newToken = r.token; });
  await t('dashboard stats (admin)', async () => { const r = await call('/dashboard/stats', { token: admin.token }); eq(r.status, 200); if (!(r.data.totals.mines >= 1)) throw new Error('no mines in totals'); });
  await t('mine list: admin sees all, operator sees own only', async () => { const a = await call('/mines', { token: admin.token }), o = await call('/mines', { token: op.token }); eq(a.status, 200); eq(o.status, 200); if (!(a.data.length >= o.data.length)) throw new Error('operator sees more than admin'); });
  await t('operator registers a mine (Pending approval)', async () => { const r = await call('/mines', { method: 'POST', token: op.token, body: { name: 'Smoke Test Mine ' + stamp, code: 'ST-' + stamp, subsidiary: 'TEST', state: 'Jharkhand', lat: 23.5, lon: 86.1, production: 100, workers: 50, ppeCompliance: 95 } }); eq(r.status, 201); eq(r.data.approval, 'Pending'); mineId = r.data.id; });
  await t('operator cannot approve a mine (403)', async () => eq((await call(`/mines/${mineId}/approval`, { method: 'PATCH', token: op.token, body: { decision: 'Approved' } })).status, 403));
  await t('admin approves the mine', async () => { const r = await call(`/mines/${mineId}/approval`, { method: 'PATCH', token: admin.token, body: { decision: 'Approved' } }); eq(r.status, 200); eq(r.data.approval, 'Approved'); });
  await t('invalid sensor reading is rejected (400)', async () => eq((await call('/sensors', { method: 'POST', token: op.token, body: { mineId, methane: 'abc', pm10: 50, temperature: 30, humidity: 60, ph: 7 } })).status, 400));
  await t('methane 1.5 reading raises a Critical alert', async () => { const r = await call('/sensors', { method: 'POST', token: op.token, body: { mineId, methane: 1.5, pm10: 50, temperature: 30, humidity: 60, ph: 7 } }); eq(r.status, 201); if (!r.data.alerts.some(a => a.severity === 'Critical')) throw new Error('no Critical alert'); });
  await t('sensor readings can be read back', async () => { const r = await call('/sensors?mineId=' + mineId, { token: op.token }); eq(r.status, 200); if (!r.data.length) throw new Error('empty'); });
  await t('simulated readings run', async () => eq((await call('/sensors/simulate', { method: 'POST', token: admin.token })).status, 200));
  await t('operator cannot run compliance check (403)', async () => eq((await call('/compliance/check', { method: 'POST', token: op.token })).status, 403));
  await t('inspector runs the compliance check', async () => eq((await call('/compliance/check', { method: 'POST', token: insp.token })).status, 200));
  await t('compliance summary loads', async () => { const r = await call('/compliance/summary', { token: insp.token }); eq(r.status, 200); if (!r.data.mines.length) throw new Error('empty'); });
  await t('alerts list includes our Critical alert', async () => { const r = await call('/alerts', { token: insp.token }); eq(r.status, 200); const a = r.data.find(x => x.mineId === mineId && x.severity === 'Critical'); if (!a) throw new Error('alert missing'); alertId = a.id; });
  await t('inspector resolves the alert', async () => { const r = await call('/alerts/' + alertId, { method: 'PATCH', token: insp.token, body: { status: 'Resolved' } }); eq(r.status, 200); eq(r.data.status, 'Resolved'); });
  await t('inspector starts and completes an inspection', async () => { eq((await call(`/mines/${mineId}/inspect`, { method: 'POST', token: insp.token, body: { action: 'start' } })).status, 200); eq((await call(`/mines/${mineId}/inspect`, { method: 'POST', token: insp.token, body: { action: 'complete' } })).status, 200); });
  for (const type of ['daily', 'weekly', 'monthly', 'mine-performance', 'environmental', 'safety', 'violations'])
    await t(`report "${type}" (JSON)`, async () => { const r = await call('/reports/' + type, { token: admin.token }); eq(r.status, 200); if (!Array.isArray(r.data.rows)) throw new Error('no rows'); });
  await t('report CSV download', async () => { const r = await fetch(BASE + '/reports/violations?format=csv', { headers: { Authorization: 'Bearer ' + admin.token } }); eq(r.status, 200); if (!/csv/.test(r.headers.get('content-type'))) throw new Error('not csv'); });
  await t('operator submits a grievance', async () => eq((await call('/grievances', { method: 'POST', token: op.token, body: { subject: 'Smoke test grievance', category: 'Safety', description: 'This is an automated test grievance.' } })).status, 201));
  await t('admin lists and answers the grievance', async () => { const l = await call('/grievances', { token: admin.token }); eq(l.status, 200); const g = l.data.find(x => x.subject === 'Smoke test grievance'); if (!g) throw new Error('not found'); eq((await call('/grievances/' + g.id, { method: 'PATCH', token: admin.token, body: { status: 'Resolved', response: 'Test reply' } })).status, 200); });
  await t('operator cannot answer grievances (403)', async () => eq((await call('/grievances/x', { method: 'PATCH', token: op.token, body: { status: 'Resolved' } })).status, 403));
  await t('admin: user list, activity log', async () => { eq((await call('/users', { token: admin.token })).status, 200); eq((await call('/activity', { token: admin.token })).status, 200); });
  await t('operator cannot read user list or activity log (403)', async () => { eq((await call('/users', { token: op.token })).status, 403); eq((await call('/activity', { token: op.token })).status, 403); });
  await t('public contact form saves a message', async () => eq((await call('/public/contact', { method: 'POST', body: { name: 'Smoke', email: 'smoke@test.in', topic: 'Feedback', message: 'Automated smoke test message.' } })).status, 201));
  await t('admin disables then deletes the test user', async () => { const u = (await call('/users', { token: admin.token })).data.find(x => x.email === `smoke${stamp}@test.in`); eq((await call('/users/' + u.id, { method: 'PATCH', token: admin.token, body: { active: false } })).status, 200); eq((await call('/auth/me', { token: newToken })).status, 401, 'disabled user token'); eq((await call('/users/' + u.id, { method: 'DELETE', token: admin.token })).status, 200); });
  await t('admin deletes the test mine (cleanup)', async () => eq((await call('/mines/' + mineId, { method: 'DELETE', token: admin.token })).status, 200));
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('Could not run the tests: ' + e.message + '\nIs the backend running at ' + BASE + ' ?'); process.exit(2); });
