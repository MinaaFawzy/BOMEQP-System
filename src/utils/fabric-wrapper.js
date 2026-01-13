// Wrapper for fabric.js to handle CommonJS export in Vite
// @ts-ignore
// eslint-disable-next-line
import fabricModule from 'fabric/dist/fabric.js';

// fabric.js v5 exports as CommonJS: exports.fabric = fabric;
// In Vite/ES modules, CommonJS exports are available as default or as properties
const fabric = fabricModule?.fabric || fabricModule?.default?.fabric || fabricModule?.default || fabricModule || {};

export default fabric;
