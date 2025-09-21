// Chart rendering helpers (Chart.js)
let histChart = null, fanChart = null;

function renderHistogram(outcomes) {
  const ctx = document.getElementById('histChart').getContext('2d');
  if(histChart) histChart.destroy();
  // build histogram bins
  const bins = 30;
  const minV = Math.min(...outcomes), maxV = Math.max(...outcomes);
  const span = Math.max(1, maxV - minV);
  const binSize = span / bins;
  const counts = new Array(bins).fill(0);
  outcomes.forEach(v=>{
    const idx = Math.min(bins-1, Math.floor((v - minV)/binSize));
    counts[idx]++;
  });
  const labels = counts.map((_,i)=> formatCurrency(minV + i*binSize));
  histChart = new Chart(ctx, {
    type: 'bar',
    data: { labels, datasets: [{ label: 'Runs', data: counts, backgroundColor: 'rgba(54,162,235,0.6)'}] },
    options: { responsive:true, scales:{ x:{ title:{ display:true, text:'Final balance (AUD)'}}, y:{ title:{display:true,text:'# of runs'} } } }
  });
}

function renderFan(paths, ages, deterministicBalances=[]) {
  // paths: array of arrays (balances per year). ages: list of ages corresponding to indices
  const maxYears = Math.max(...paths.map(p=>p.length), deterministicBalances.length);
  // ensure ages length
  const ageLabels = ages.slice(0, maxYears);
  // compute percentiles per year
  const median = [], p10 = [], p90 = [], p25 = [], p75 = [];
  for(let y=0;y<maxYears;y++){
    const vals = paths.map(p => p[y] ?? 0);
    median.push(percentile(vals, 0.5));
    p10.push(percentile(vals, 0.1));
    p90.push(percentile(vals, 0.9));
    p25.push(percentile(vals, 0.25));
    p75.push(percentile(vals, 0.75));
  }

  const ctx = document.getElementById('fanChart').getContext('2d');
  if(fanChart) fanChart.destroy();
  const datasets = [
    { label: 'Deterministic', data: deterministicBalances, borderColor:'black', borderWidth:2, fill:false, pointRadius:0 },
    { label: 'Median', data: median, borderColor:'blue', fill:false, pointRadius:0},
    { label: '10-90% upper', data: p90, borderColor:'transparent', backgroundColor:'rgba(54,162,235,0.18)', fill:'+1', pointRadius:0 },
    { label: '10-90% lower', data: p10, borderColor:'transparent', backgroundColor:'rgba(54,162,235,0.18)', fill:false, pointRadius:0 },
    { label: '25-75% upper', data: p75, borderColor:'transparent', backgroundColor:'rgba(255,159,64,0.22)', fill:'+1', pointRadius:0 },
    { label: '25-75% lower', data: p25, borderColor:'transparent', backgroundColor:'rgba(255,159,64,0.22)', fill:false, pointRadius:0 }
  ];

  fanChart = new Chart(ctx, {
    type:'line',
    data: { labels: ageLabels, datasets },
    options: { responsive:true, interaction:{ mode:'index', intersect:false }, plugins:{ title:{ display:true, text:'Fan chart: balances vs age' }, tooltip:{ callbacks:{ label: ctx => formatCurrency(ctx.raw) } } }, scales:{ x:{ title:{ display:true, text:'Age' } }, y:{ title:{ display:true, text:'Balance (AUD)' }, beginAtZero:true } } }
  });
}
