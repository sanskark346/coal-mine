// Creates demonstration data the first time the server starts. All sensor values are SIMULATED.
const bcrypt = require('bcryptjs');
const db = require('../models');
const { processReading, checkMine } = require('./compliance');
const ago = d => new Date(Date.now() - d * 864e5).toISOString();
const ymd = d => ago(d).slice(0, 10);

module.exports = async () => {
  if ((await db.users.find()).length) return;
  console.log('Seeding demonstration data...');
  const mk = async (name, email, pw, role, org) => db.users.create({ name, email, role, organisation: org, active: true, password: await bcrypt.hash(pw, 10) });
  const admin = await mk('Anita Rao (Admin)', 'admin@coal.gov', 'Admin@123', 'admin', 'Ministry of Coal');
  const op1 = await mk('R. K. Singh (Operator)', 'operator@coal.gov', 'Operator@123', 'operator', 'BCCL');
  const op2 = await mk('P. Nair (Operator)', 'operator2@coal.gov', 'Operator@123', 'operator', 'SECL');
  await mk('S. Khan (Inspector)', 'inspector@coal.gov', 'Inspector@123', 'inspector', 'DGMS');
  const eq = (...n) => n.map((x, i) => ({ name: x, status: i === 2 ? 'Maintenance' : 'Operational' }));
  const data = [
    ['Jharia Block-II', 'BCCL-JH2', 'BCCL', 'Jharkhand', 23.75, 86.42, op1, 5200, 940, 91, 12, ymd(48)],
    ['Gevra OC', 'SECL-GV1', 'SECL', 'Chhattisgarh', 22.35, 82.55, op2, 9800, 1800, 97, 30, ymd(10)],
    ['Talcher Kalinga', 'MCL-TK3', 'MCL', 'Odisha', 20.95, 85.22, op1, 7400, 1260, 95, 30, ymd(12)],
    ['Singrauli Jayant', 'NCL-JY4', 'NCL', 'Madhya Pradesh', 24.2, 82.67, op2, 8800, 1500, 96, 30, ymd(5)],
    ['Umrer OC', 'WCL-UM5', 'WCL', 'Maharashtra', 20.85, 79.33, admin, 3100, 620, 84, 30, ymd(20)],
    ['Rajmahal OC', 'ECL-RJ6', 'ECL', 'Jharkhand', 24.9, 87.8, admin, 6900, 1100, 93, 30, ymd(8)]
  ];
  const mines = [];
  for (const d of data) mines.push(await db.mines.create({ name: d[0], code: d[1], subsidiary: d[2], state: d[3], lat: d[4], lon: d[5], operatorId: d[6].id, operatorName: d[6].name, production: d[7], workers: d[8], ppeCompliance: d[9], inspectionIntervalDays: d[10], lastInspection: d[11], equipment: eq('Dragline', 'Shovel', 'Dumper fleet', 'Ventilation fan'), status: 'Active', approval: 'Approved', underInspection: false, complianceScore: 100 }));
  await db.mines.create({ name: 'Sohagpur Expansion', code: 'SECL-SP7', subsidiary: 'SECL', state: 'Madhya Pradesh', lat: 23.3, lon: 81.4, operatorId: op2.id, operatorName: op2.name, production: 0, workers: 120, ppeCompliance: 95, inspectionIntervalDays: 30, lastInspection: ymd(2), equipment: [], status: 'Active', approval: 'Pending', underInspection: false, complianceScore: 100 });
  await db.mines.update(mines[3].id, { underInspection: true });

  // Simulated sensor history (24 hourly readings per mine); the latest values drive the alerts.
  let seed = 7; const rnd = (a, b, d = 2) => { seed = (seed * 9301 + 49297) % 233280; return +(a + (seed / 233280) * (b - a)).toFixed(d); };
  for (const m of mines) {
    for (let h = 24; h >= 1; h--) await db.sensors.create({ mineId: m.id, methane: rnd(0.2, 0.6), pm10: rnd(45, 95, 0), temperature: rnd(26, 34, 1), humidity: rnd(55, 85, 0), ph: rnd(6.8, 8, 1), source: 'simulated', createdAt: new Date(Date.now() - h * 36e5).toISOString() });
  }
  const last = { 0: { methane: 1.42, pm10: 130, temperature: 33, humidity: 70, ph: 7.2 }, 2: { methane: 0.5, pm10: 265, temperature: 31, humidity: 65, ph: 7.4 }, 4: { methane: 0.82, pm10: 80, temperature: 38.2, humidity: 60, ph: 6.1 } };
  // Past alerts spread over six months so the monthly chart has real data.
  const past = [['Safety', 'Critical', true, 'Methane level exceeded the critical limit'], ['Environmental', 'Warning', false, 'PM10 above warning level'], ['Compliance', 'High', true, 'Safety inspection was overdue'], ['Safety', 'High', true, 'PPE compliance below requirement'], ['Environmental', 'Critical', true, 'Air quality exceeded limit']];
  for (let i = 0; i < 22; i++) {
    const m = mines[i % 6], p = past[i % 5], d = 8 + Math.floor(i * 7.8);
    await db.alerts.create({ mineId: m.id, mineName: m.name, rule: 'history', category: p[0], severity: p[1], isViolation: p[2], reason: p[3], action: 'Corrective action completed', status: 'Resolved', date: ymd(d), createdAt: ago(d), resolvedAt: ago(d - 2) });
  }
  for (const i in last) { const r = await db.sensors.create({ mineId: mines[i].id, ...last[i], source: 'simulated' }); await processReading(mines[i], r); }
  for (const m of mines) await checkMine(m);
  await db.grievances.create({ subject: 'Drinking water not available at Panel 3', category: 'Worker welfare', description: 'Workers in Panel 3 have no clean drinking water during the afternoon shift.', mineId: mines[0].id, userId: op1.id, userName: op1.name, status: 'Under Review', response: 'Inspector has been asked to visit.' });
  await db.activity.create({ user: 'System', role: 'system', action: 'Demonstration data created' });
  console.log('Demo accounts: admin@coal.gov / Admin@123, operator@coal.gov / Operator@123, inspector@coal.gov / Inspector@123');
};
