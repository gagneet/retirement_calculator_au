// Utility helpers
const $id = id => document.getElementById(id);

function formatCurrency(num) {
  if (isNaN(num) || num === null) return "$0";
  return num.toLocaleString('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 });
}

// Box-Muller normal RNG
function randomNormal(mean=0, sd=1) {
  let u=0,v=0;
  while(u===0) u=Math.random();
  while(v===0) v=Math.random();
  const z = Math.sqrt(-2.0*Math.log(u))*Math.cos(2*Math.PI*v);
  return mean + z*sd;
}

function percentile(arr, p) {
  if(!arr || arr.length===0) return 0;
  const a = [...arr].sort((x,y)=>x-y);
  const idx = Math.floor(p*a.length);
  return a[Math.min(idx, a.length-1)];
}

// export CSV (array of arrays)
function downloadCSV(filename, rows) {
  const csv = rows.map(r => r.map(c => `"${(''+c).replace(/"/g,'""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], {type: 'text/csv'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}
