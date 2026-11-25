// Collections and their fields:
// users: name, email, password(hash), role(admin|operator|inspector), organisation, active
// mines: name, code, subsidiary, state, lat, lon, operatorId, operatorName, production, workers, ppeCompliance,
//        equipment[{name,status}], status(Active|Warning|Critical), approval, underInspection, lastInspection,
//        inspectionIntervalDays, complianceScore
// sensors: mineId, methane, pm10, temperature, humidity, ph, source(simulated|manual)
// alerts: mineId, mineName, rule, category, severity, isViolation, reason, action, status(Open|Resolved), date
// grievances: subject, category, description, mineId, userId, userName, status, response
// activity: user, role, action
// contacts: name, email, topic, message (public contact form)
const { col } = require('./store');
module.exports = { users: col('users'), mines: col('mines'), sensors: col('sensors'), alerts: col('alerts'), grievances: col('grievances'), activity: col('activity'), contacts: col('contacts') };
