const fs = require('node:fs');
const path = require('node:path');
const { sha } = require('./publication.cjs');

const collections = {
  'public-entries.json': 'entries', 'public-assets.json': 'assets',
  'public-system.json': 'inputs', 'public-relations.json': 'relations',
  'publication-decisions.json': 'decisions'
};
function readRegistries(root) {
  const bytes = {}, data = {}, hashes = {};
  for (const relative of ['src', 'src/wiki', ...Object.keys(collections).map(name => 'src/wiki/' + name)]) {
    if (fs.lstatSync(path.join(root, relative)).isSymbolicLink()) throw Error('UNSAFE_REGISTRY_PATH');
  }
  for (const [name, key] of Object.entries(collections)) {
    bytes[name] = fs.readFileSync(path.join(root, 'src/wiki', name), 'utf8');
    data[name] = JSON.parse(bytes[name]);
    if (data[name].schema_version !== 1 || !Array.isArray(data[name][key]) || Object.keys(data[name]).some(field => !['schema_version', key].includes(field))) throw Error('INVALID_REGISTRY');
    hashes[name] = sha(bytes[name]);
  }
  return { bytes, data, hashes };
}
module.exports = { collections, readRegistries };
