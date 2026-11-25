// Rule-based compliance engine. This is NOT a trained AI model: it applies configurable thresholds.
const db = require('../models');
const { readingsOf } = require('./helpers');
const n = (k, d) => (process.env[k] !== undefined && process.env[k] !== '' ? Number(process.env[k]) : d);
const T = () => ({ methaneWarn: n('METHANE_WARN', 0.75), methaneCrit: n('METHANE_CRIT', 1.25), pm10Warn: n('PM10_WARN', 100), pm10Crit: n('PM10_CRIT', 250), tempWarn: n('TEMP_WARN', 37), phMin: 6.5, phMax: 8.5, ppeMin: n('PPE_MIN', 90) });
const SENSOR_RULES = ['methane', 'pm10', 'temp', 'ph'];
const MINE_RULES = ['inspection', 'ppe'];
const PEN = { Critical: 20, High: 10, Warning: 5 };
const days = d => Math.floor((Date.now() - new Date(d)) / 864e5);
const f = (rule, category, severity, isViolation, reason, action) => ({ rule, category, severity, isViolation, reason, action });

function evalReading(r) {
  const t = T(), out = [];
  if (r.methane >= t.methaneCrit) out.push(f('methane', 'Safety', 'Critical', true, `Methane level ${r.methane}% exceeds the critical limit of ${t.methaneCrit}%`, 'Evacuate the affected section, switch off electrical equipment, ventilate and re-test before re-entry'));
  else if (r.methane >= t.methaneWarn) out.push(f('methane', 'Safety', 'Warning', false, `Methane level ${r.methane}% is above the warning level of ${t.methaneWarn}%`, 'Increase ventilation and monitor every 15 minutes'));
  if (r.pm10 >= t.pm10Crit) out.push(f('pm10', 'Environmental', 'Critical', true, `Air quality is poor: PM10 ${r.pm10} µg/m³ exceeds ${t.pm10Crit} µg/m³`, 'Start dust suppression, stop blasting and notify the environment officer'));
  else if (r.pm10 >= t.pm10Warn) out.push(f('pm10', 'Environmental', 'Warning', false, `Air quality has dropped: PM10 ${r.pm10} µg/m³ is above ${t.pm10Warn} µg/m³`, 'Use water sprinklers on haul roads and check dust control equipment'));
  if (r.temperature >= t.tempWarn) out.push(f('temp', 'Safety', 'Warning', false, `Temperature ${r.temperature}°C is above ${t.tempWarn}°C`, 'Check ventilation, provide drinking water and rotate workers'));
  if (r.ph < t.phMin || r.ph > t.phMax) out.push(f('ph', 'Environmental', 'Warning', true, `Water pH ${r.ph} is outside the permitted ${t.phMin}–${t.phMax}`, 'Treat mine water before discharge and collect a lab sample'));
  return out;
}
function evalMine(m) {
  const t = T(), out = [], d = days(m.lastInspection);
  if (d > m.inspectionIntervalDays) out.push(f('inspection', 'Compliance', 'High', true, `Safety inspection is overdue by ${d - m.inspectionIntervalDays} days`, 'Schedule the statutory safety inspection within 48 hours'));
  if (m.ppeCompliance < t.ppeMin) out.push(f('ppe', 'Safety', 'High', true, `PPE compliance ${m.ppeCompliance}% is below the required ${t.ppeMin}%`, 'Run a PPE audit and hold a safety briefing for workers'));
  return out;
}
const score = alerts => Math.max(0, 100 - alerts.filter(a => a.status === 'Open').reduce((s, a) => s + (PEN[a.severity] || 5), 0));
const resolve = (a, note) => db.alerts.update(a.id, { status: 'Resolved', resolvedAt: new Date().toISOString(), note });

async function raise(mine, fd) {
  const open = (await db.alerts.find({ mineId: mine.id, status: 'Open' })).filter(a => a.rule === fd.rule);
  if (open.some(a => a.severity === fd.severity)) return null;
  for (const a of open) await resolve(a, 'Replaced by a new severity level');
  return db.alerts.create({ ...fd, mineId: mine.id, mineName: mine.name, status: 'Open', date: new Date().toISOString().slice(0, 10) });
}
async function refresh(mineId) {
  const open = await db.alerts.find({ mineId, status: 'Open' });
  const status = open.some(a => a.severity === 'Critical') ? 'Critical' : open.length ? 'Warning' : 'Active';
  return db.mines.update(mineId, { status, complianceScore: score(open) });
}
async function apply(mine, found, ruleSet) {
  const rules = found.map(x => x.rule);
  for (const a of await db.alerts.find({ mineId: mine.id, status: 'Open' }))
    if (ruleSet.includes(a.rule) && !rules.includes(a.rule)) await resolve(a, 'Condition is back to normal');
  const created = [];
  for (const fd of found) { const a = await raise(mine, fd); if (a) created.push(a); }
  await refresh(mine.id);
  return created;
}
exports.T = T; exports.score = score;
exports.processReading = (mine, reading) => apply(mine, evalReading(reading), SENSOR_RULES);
exports.checkMine = async mine => {
  const fresh = await db.mines.get(mine.id);
  const a = await apply(fresh, evalMine(fresh), MINE_RULES);
  const r = (await readingsOf(mine.id)).pop();
  const b = r ? await apply(fresh, evalReading(r), SENSOR_RULES) : [];
  return [...a, ...b];
};
exports.risk = s => (s >= 85 ? 'Low' : s >= 65 ? 'Medium' : s >= 40 ? 'High' : 'Critical');
