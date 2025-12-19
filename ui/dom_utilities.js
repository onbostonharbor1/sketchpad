// ui/dom_utilities.js
function $(id) { return document.getElementById(id); } // end $
function clear(el) { if (el) el.innerHTML = ''; } // end clear
function show(el) { if (el) el.style.display = ''; } // end show
function hide(el) { if (el) el.style.display = 'none'; } // end hide

function el(tag, opts = {}) {
  const n = document.createElement(tag);
  if (opts.class) n.className = opts.class;
  if (opts.text) n.textContent = opts.text;
  if (opts.html) n.innerHTML = opts.html;
  if (opts.attrs)
    Object.entries(opts.attrs).forEach(([k, v]) => n.setAttribute(k, v));
  return n;
} // end el
