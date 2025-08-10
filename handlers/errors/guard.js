// handlers/errors/guard.js
module.exports = function guard(fn){
  return async (...args) => {
    try { return await fn(...args); }
    catch(e){ try { args[0]?.logger?.error?.(e); } catch{} }
  };
}
