// One small data layer with two back ends: MongoDB (Mongoose) or a local JSON file.
const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');
const FILE = path.join(__dirname, '..', 'data', 'db.json');
let mode = 'json', mg = null, mem = {};
const models = {};
exports.mode = () => mode;
exports.init = (m, mongoose) => {
  mode = m; mg = mongoose;
  if (m === 'json') { try { mem = JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch (e) { mem = {}; } }
};
const save = () => { fs.mkdirSync(path.dirname(FILE), { recursive: true }); fs.writeFileSync(FILE, JSON.stringify(mem, null, 1)); };
const M = n => models[n] || (models[n] = mg.model(n, new mg.Schema({ id: { type: String, index: true } }, { strict: false, versionKey: false })));
const clean = d => { const { _id, ...r } = d; return r; };
const match = (o, f) => Object.keys(f).every(k => o[k] === f[k]);
exports.col = n => ({
  async find(f = {}) {
    if (mode === 'mongo') return (await M(n).find(f).lean()).map(clean);
    return (mem[n] || []).filter(o => match(o, f)).map(o => ({ ...o }));
  },
  async get(id) { return (await this.find({ id }))[0] || null; },
  async create(d) {
    const o = { createdAt: new Date().toISOString(), ...d, id: randomUUID() };
    if (mode === 'mongo') await M(n).create(o); else { (mem[n] = mem[n] || []).push(o); save(); }
    return o;
  },
  async update(id, d) {
    const p = { ...d, updatedAt: new Date().toISOString() }; delete p.id;
    if (mode === 'mongo') await M(n).updateOne({ id }, { $set: p });
    else { const o = (mem[n] || []).find(x => x.id === id); if (!o) return null; Object.assign(o, p); save(); }
    return this.get(id);
  },
  async remove(id) {
    if (mode === 'mongo') await M(n).deleteOne({ id }); else { mem[n] = (mem[n] || []).filter(x => x.id !== id); save(); }
    return true;
  }
});
