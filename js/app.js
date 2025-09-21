// App wiring: read inputs, run simulations, update UI, sanity-check + export
const $ = id => document.getElementById(id);

function collectInputsFromUI(){
  return {
    yourAge: Number($('yourAge').value),
    partnerAge: Number($('partnerAge').value),
    retireAge: Number($('retireAge').value),
    partnerRetireAge: Number($('partnerRetireAge').value),
    yourDeathAge: Number($('yourDeathAge').value) || null,
    partnerDeathAge: Number($('partnerDeathAge').value) || null,
    useFixedDeathAges: $('useFixedDeathAges').checked,
    yourSurvivalProb: Number($('yourSurvivalProb').value),
    partnerSurvivalProb: Number($('partnerSurvivalProb').value),

    currentSuper: Number($('currentSuper').value),
    currentSavings: Number($('currentSavings').value),
    currentStocks: Number($('currentStocks').value),
    monthlyStockContribution: Number($('monthlyStockContribution').value),
    asfaComfort: Number($('asfaComfort').value),
    asfaSingle: Number($('asfaSingle').value),

    inflationMean: Number($('inflationMean').value),
    inflationVol: Number($('inflationVol').value),
    returnDecline: Number($('returnDecline').value),

    allocEquities: Number($('allocEquities').value),
    allocBonds: Number($('allocBonds').value),
    allocCash: Number($('allocCash').value),

    enableShocks: $('enableShocks').checked,
    shockProb: Number($('shockProb').value),
    shockEquity: Number($('shockEquity').value),
    shockBond: Number($('shockBond').value),

    equityMean: Number($('equityMean').value),
    equitySd: Number($('equitySd').value),
    bondMean: Number($('bondMean').value),
    bondSd: Number($('bondSd').value),
    cashMean: Number($('cashMean').value),
    cashSd: Number($('cashSd').value),

    investmentTaxRate: Number(15) // currently fixed; could be surfaced
  };
}

// preset allocations hookup
$('presetAllocation').addEventListener('change', ()=>{
  const v = $('presetAllocation').value;
  const p = ALLOCATION_PRESETS[v];
  $('allocEquities').value = p.e;
  $('allocBonds').value = p.b;
  $('allocCash').value = p.c;
});

// run deterministic
$('btnDeterministic').addEventListener('click', ()=>{
  const inputs = collectInputsFromUI();
  const det = simulateDeterministic(inputs);
  // show summary and charts with single deterministic path
  const ages = det.ages;
  renderHistogram([det.finalBalance]); // simple 1-value histogram
  renderFan([det.balances], ages, det.balances);
  $('summaryText').innerHTML = `<div class="p-2 bg-gray-50 rounded">Deterministic final balance (end of horizon): <strong>${formatCurrency(det.finalBalance)}</strong></div>`;
});

// run Monte Carlo with progress + sanity-check
$('btnRun').addEventListener('click', async ()=>{
  const inputs = collectInputsFromUI();
  const runs = Math.max(100, Number($('numRuns').value) || 1000);
  const enableSanity = $('enableSanity').checked;
  $('progressContainer').classList.remove('hidden'); $('progressBar').style.width='0%'; $('progressText').textContent = 'Starting...';
  // update asset class params to UI values
  ASSET_CLASS.equity.mean = $('equityMean').value/100;
  ASSET_CLASS.equity.sd = $('equitySd').value/100;
  ASSET_CLASS.bond.mean = $('bondMean').value/100;
  ASSET_CLASS.bond.sd = $('bondSd').value/100;
  ASSET_CLASS.cash.mean = $('cashMean').value/100;
  ASSET_CLASS.cash.sd = $('cashSd').value/100;

  // progress callback
  let lastPct = 0;
  const progressCb = (done, total) => {
    const pct = Math.round(done/total*100);
    if(pct !== lastPct){
      lastPct = pct;
      $('progressBar').style.width = pct + '%';
      $('progressText').textContent = `Running simulations... ${pct}% (${done}/${total})`;
    }
  };

  // prepare deterministic baseline and (optionally) sanity check
  const det = simulateDeterministic(inputs);
  // Run Monte Carlo normally
  const { outcomes, paths } = await runMonteCarlo(inputs, runs, progressCb, { stochasticInflation:true, includeShocks: inputs.enableShocks });

  $('progressBar').style.width = '100%';
  $('progressText').textContent = 'Rendering results...';
  $('progressContainer').classList.add('hidden');

  // display summary
  const median = percentile(outcomes, 0.5);
  const p10 = percentile(outcomes, 0.1);
  const p90 = percentile(outcomes, 0.9);
  const successRate = outcomes.filter(v=>v>0).length / outcomes.length;
  $('summaryText').innerHTML = `
    <div class="grid grid-cols-3 gap-2 text-sm">
      <div class="p-2 bg-blue-50 rounded"><strong>Runs</strong><div>${runs.toLocaleString()}</div></div>
      <div class="p-2 bg-green-50 rounded"><strong>Success rate</strong><div>${(successRate*100).toFixed(1)}%</div></div>
      <div class="p-2 bg-gray-50 rounded"><strong>Median final balance</strong><div>${formatCurrency(median)}</div></div>
    </div>`;

  // charts
  renderHistogram(outcomes);
  // ages: use deterministic ages (if no deterministic ages, generate from retirement age)
  const agesLabels = det.ages.length ? det.ages : Array.from({length: Math.max(...paths.map(p=>p.length))}, (_,i)=>inputs.retireAge + i);
  renderFan(paths, agesLabels, det.balances);

  // sanity-check if requested: run MC with zero vol and compare median path to deterministic
  if(enableSanity) {
    // quick MC run with zero volatility and stochasticInflation=false and shocks=false
    const zeroVolInputs = JSON.parse(JSON.stringify(inputs));
    // temporarily set asset class sd to zero
    const saved = { e: ASSET_CLASS.equity.sd, b: ASSET_CLASS.bond.sd, c: ASSET_CLASS.cash.sd };
    ASSET_CLASS.equity.sd = 0; ASSET_CLASS.bond.sd = 0; ASSET_CLASS.cash.sd = 0;

    // run small MC with same runs but deterministic draws
    const { outcomes: zOut, paths: zPaths } = await runMonteCarlo(zeroVolInputs, runs, (d,t)=>{}, { stochasticInflation:false, includeShocks:false });
    // median path of zPaths
    const maxYears = Math.max(...zPaths.map(p=>p.length), det.balances.length);
    let medianMatches = true;
    for(let y=0;y<maxYears;y++){
      const vals = zPaths.map(p => p[y] ?? 0);
      const med = percentile(vals, 0.5);
      const detv = det.balances[y] ?? 0;
      if(Math.abs(med - detv) > (Math.abs(detv) * SANITY_TOL + 1e-3)) { medianMatches = false; break; }
    }

    // restore sds
    ASSET_CLASS.equity.sd = saved.e; ASSET_CLASS.bond.sd = saved.b; ASSET_CLASS.cash.sd = saved.c;

    $('sanityResult').innerHTML = medianMatches
      ? `<div class="p-2 bg-green-100 rounded">Sanity check passed: MC with zero volatility matches deterministic path (within tolerance).</div>`
      : `<div class="p-2 bg-red-100 rounded">Sanity check failed: MC zero-vol median differs from deterministic path — please inspect configuration.</div>`;
  } else {
    $('sanityResult').innerHTML = '';
  }

  // export CSV action
  $('exportCSV').onclick = ()=>{
    // export first N paths (maybe capped)
    const rows = [];
    const header = ['Run','Year','Age','Balance'];
    rows.push(header);
    const maxR = Math.min(paths.length, 200); // cap to 200 runs for CSV
    for(let r=0;r<maxR;r++){
      const p = paths[r];
      for(let y=0;y<p.length;y++){
        rows.push([r+1, y+1, (inputs.retireAge + y), p[y]]);
      }
    }
    downloadCSV('mc_paths.csv', rows);
  };
});

// auto-run deterministic on load
window.addEventListener('load', ()=>{ $('btnDeterministic').click(); });
