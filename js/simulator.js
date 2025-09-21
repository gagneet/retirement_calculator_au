// Simulator: deterministic & Monte Carlo engine with allocation, survivor, inflation, shocks
// Exports: simulateDeterministic(inputs), runMonteCarlo(inputs, runs, progressCallback, options)

function clampPct(v){ return Math.max(0, Math.min(100, v)); }

// compute portfolio mean & sd from allocation and asset class params
function portfolioStats(alloc, assetParams = ASSET_CLASS, corrs = CORRELATIONS) {
  // alloc: {e,b,c} in percentages (0..100)
  const we = alloc.e/100, wb = alloc.b/100, wc = alloc.c/100;
  const mu = we*assetParams.equity.mean + wb*assetParams.bond.mean + wc*assetParams.cash.mean;
  // variance = w^2*sigma^2 + 2*sum w_i w_j cov_ij
  const s_e = assetParams.equity.sd, s_b = assetParams.bond.sd, s_c = assetParams.cash.sd;
  const cov_eb = corrs.equity_bond * s_e * s_b;
  const cov_ec = corrs.equity_cash * s_e * s_c;
  const cov_bc = corrs.bond_cash * s_b * s_c;
  const varp = we*we*s_e*s_e + wb*wb*s_b*s_b + wc*wc*s_c*s_c
              + 2*(we*wb*cov_eb + we*wc*cov_ec + wb*wc*cov_bc);
  const sd = Math.sqrt(Math.max(0, varp));
  return { mu, sd };
}

// helper: convert percent input to decimal
function pctToDec(x){ return (Number(x)||0)/100; }

// simulate one retirement path (returns object with balances by year from retirement start)
function simulatePath(inputs, rngOptions = { stochasticInflation:true, shocks:true, useRandomReturns:true, survivalDraws:null }) {
  // inputs: many numeric fields (we'll read values passed by app)
  // returns { balances: [yearly balances from retirement start], finalBalance, ages: [ages], deathFlags: {youDeadYear, partnerDeadYear}, pathMeta }
  // Convert key parameters
  const yourAge = Number(inputs.yourAge);
  const partnerAge = Number(inputs.partnerAge);
  const retireAge = Number(inputs.retireAge);
  const partnerRetireAge = Number(inputs.partnerRetireAge);
  const yearsToRet = Math.max(0, retireAge - yourAge);
  const yearsToPartnerRet = Math.max(0, partnerRetireAge - partnerAge);

  // death ages / survival probabilities
  const useFixed = !!inputs.useFixedDeathAges;
  const yourDeathAgeFixed = Number(inputs.yourDeathAge) || null;
  const partnerDeathAgeFixed = Number(inputs.partnerDeathAge) || null;
  const yourSurvProb = (Number(inputs.yourSurvivalProb)||99)/100;
  const partnerSurvProb = (Number(inputs.partnerSurvivalProb)||98.5)/100;

  // asset initial
  let superAmt = Number(inputs.currentSuper) || 0;
  let savings = Number(inputs.currentSavings) || 0;
  let stocks = Number(inputs.currentStocks) || 0;
  const monthlyStocks = Number(inputs.monthlyStockContribution) || 0;

  const asfaCouple = Number(inputs.asfaComfort) || 0;
  const asfaSingle = Number(inputs.asfaSingle) || Math.round(asfaCouple*0.7);

  // allocation -> stats
  const alloc = { e: clampPct(Number(inputs.allocEquities)||60), b: clampPct(Number(inputs.allocBonds)||30), c: clampPct(Number(inputs.allocCash)||10) };
  // normalize to 100
  const sumAlloc = alloc.e + alloc.b + alloc.c;
  if(sumAlloc !== 100) { alloc.e = alloc.e/sumAlloc*100; alloc.b = alloc.b/sumAlloc*100; alloc.c = alloc.c/sumAlloc*100; }
  const { mu: portMeanPct, sd: portSdPct } = portfolioStats(alloc);

  // convert to decimals
  const investmentReturn = (Number(inputs.investmentReturn)||5.61)/100; // used as base expected return for portfolio if user supplied, else use allocation
  // We'll use portfolio-derived mean if user didn't set an explicit base; or mix — simpler: use weighted portfolio mean
  const baseReturn = portMeanPct; // decimal (e.g. 0.07)
  const baseSd = portSdPct; // decimal (e.g. 0.15)

  const returnDeclineRatePct = Number(inputs.returnDecline)||0.03; // user enters e.g. 0.03 meaning 0.03%
  const returnVolatilityOverride = (Number(inputs.returnVol) || null); // OPTIONAL

  const inflationMean = (Number(inputs.inflationMean)||2.87)/100;
  const inflationVol = (Number(inputs.inflationVol)||1.0)/100;

  // shocks
  const enableShocks = !!inputs.enableShocks;
  const shockProb = (Number(inputs.shockProb)||5)/100;
  const shockEquity = (Number(inputs.shockEquity)||-30)/100;
  const shockBond = (Number(inputs.shockBond)||2)/100;

  // retirement horizon: until max of death ages or some max (let's use max(yourDeathAge, partnerDeathAge, retire+60))
  const maxHorizonYears = 60; // cap simulation length at 60 years after retirement to avoid runaway
  const yearsInRetirement = maxHorizonYears;

  // handle survival draws: if MC, a single run will be given option to use survivalDraws (array of booleans per year) or sample here
  // determine alive status per year for each spouse
  let youAlive = true, partnerAlive = true;
  let youDeathYear = null, partnerDeathYear = null;

  // If using fixed death ages: compute death years relative to retirement
  if(useFixed && yourDeathAgeFixed) {
    const deathYearAbsolute = yourDeathAgeFixed;
    if(deathYearAbsolute <= yourAge) youAlive = false;
    youDeathYear = deathYearAbsolute; // store absolute age
  }
  if(useFixed && partnerDeathAgeFixed) {
    const deathYearAbsolute = partnerDeathAgeFixed;
    if(deathYearAbsolute <= partnerAge) partnerAlive = false;
    partnerDeathYear = deathYearAbsolute;
  }

  // Pre-retirement accumulation (simple yearly accumulation using portfolio expected return, contributions)
  // For simplicity: we grow balances annually for yearsToRet, using expected returns (declining)
  for(let y=1;y<=yearsToRet;y++){
    const declineDecimal = (returnDeclineRatePct)/100; // e.g. 0.0003
    const expectedReturn = Math.max(0.01, baseReturn - declineDecimal*y); // floor 1%
    superAmt *= (1 + expectedReturn);
    savings *= (1 + (Number(inputs.savingsReturn)||1.4)/100);
    stocks *= (1 + expectedReturn);
    // contributions
    // approximate salary contributions—kept simple (user can refine)
    superAmt += (Number(inputs.superContribution) || 0);
    savings += (inputs.percentIncomeSaved ? (Number(inputs.percentIncomeSaved)/100) * (Number(inputs.yourSalary)||0) : 0);
    stocks += monthlyStocks*12;
  }

  // Now retirement-year-by-year simulation
  const balances = [];
  const ages = [];
  let currentBalance = superAmt + savings + stocks;
  // Starting inflation for first retirement year: use mean (deterministic) or sample (stochastic)
  let currentInflation = inflationMean;

  // survival state per year dynamic simulation (if probabilistic)
  // We'll determine death events during the loop if probabilistic
  for(let yr=0; yr<yearsInRetirement; yr++){
    const ageYou = retireAge + yr;
    const agePartner = partnerRetireAge + yr;
    // Determine if someone died at this year (if using probabilistic mode)
    if(!useFixed) {
      if(youAlive){
        const survive = (rngOptions.survivalDraws && rngOptions.survivalDraws[y] && rngOptions.survivalDraws[y].you !== undefined) ?
                        rngOptions.survivalDraws[y].you : (Math.random() < yourSurvProb);
        if(!survive){ youAlive = false; youDeathYear = ageYou; }
      }
      if(partnerAlive){
        const surviveP = (rngOptions.survivalDraws && rngOptions.survivalDraws[y] && rngOptions.survivalDraws[y].partner !== undefined) ?
                         rngOptions.survivalDraws[y].partner : (Math.random() < partnerSurvProb);
        if(!surviveP){ partnerAlive = false; partnerDeathYear = agePartner; }
      }
    } else {
      // fixed: if death age is set and <= current ages, then mark as dead now
      if(youDeathYear && ageYou >= youDeathYear) youAlive = false;
      if(partnerDeathYear && agePartner >= partnerDeathYear) partnerAlive = false;
    }

    // required spending: use couple ASFA while both alive, if only one alive switch to single ASFA
    const reqSpending = (youAlive && partnerAlive) ? asfaCouple * Math.pow(1+currentInflation, yr) : asfaSingle * Math.pow(1+currentInflation, yr);

    // compute pension / other income simplification: here we approximate pension and rental: we will treat totalIncome = 0 for clarity (you can extend)
    const totalIncome = 0;

    // netWithdrawal = max(0, required - income)
    const netWithdrawal = Math.max(0, reqSpending - totalIncome);

    // gross withdrawal uses investment tax rate
    const grossWithdrawal = (Number(inputs.investmentTaxRate)||15) >= 99 ? netWithdrawal : netWithdrawal / (1 - (Number(inputs.investmentTaxRate)||15)/100);
    if(grossWithdrawal > currentBalance) {
      // depletion
      currentBalance = 0;
      balances.push(0);
      ages.push(ageYou);
      break;
    }

    // sample inflation this year if stochastic
    if(rngOptions.stochasticInflation) {
      const sampledInfl = Math.max(0, inflationMean + randomNormal(0, inflationVol));
      currentInflation = sampledInfl;
    } else {
      currentInflation = inflationMean;
    }

    // compute expected return for this retirement year (declining)
    const declineDecimal = (returnDeclineRatePct)/100;
    const expectedReturnThisYear = Math.max(0.01, baseReturn - declineDecimal*(yearsToRet + yr)); // floor 1%
    // if shocks enabled, maybe apply shock
    let actualReturn = expectedReturnThisYear;
    if(rngOptions.useRandomReturns) {
      // combine portfolio volatility and user override
      const sigma = returnVolatilityOverride ? (Number(returnVolatilityOverride)/100) : baseSd;
      actualReturn = randomNormal(expectedReturnThisYear, sigma);
      // shock possibility (apply shock to 'equity' component by reducing overall return proportionally to equity weight)
      if(enableShocks && Math.random() < shockProb) {
        // approximate effect: reduce returns by (equityWeight * shockEquity) + (bondWeight * shockBond)
        const shockEffect = (alloc.e/100) * shockEquity + (alloc.b/100) * shockBond + (alloc.c/100) * 0;
        actualReturn += shockEffect; // shockEffect typically negative
      }
    }

    // monthly compounding simulation for growth & withdrawals
    const monthlyReturn = Math.pow(1 + actualReturn, 1/12) - 1;
    const monthlyWithdrawal = grossWithdrawal / 12;
    let yearlyGrowth = 0;
    let startBalance = currentBalance;
    for(let m=0;m<12;m++){
      const mg = currentBalance * monthlyReturn;
      yearlyGrowth += mg;
      currentBalance = currentBalance + mg - monthlyWithdrawal;
      if(currentBalance <= 0) { currentBalance = 0; break; }
    }

    balances.push(Math.max(0, currentBalance));
    ages.push(ageYou);
    if(currentBalance <= 0) break;
  }

  return {
    balances,
    finalBalance: currentBalance,
    ages,
    youDeathAge: youDeathYear,
    partnerDeathAge: partnerDeathYear
  };
}

// wrapper: deterministic path (no randomness)
function simulateDeterministic(inputs) {
  return simulatePath(inputs, { stochasticInflation:false, shocks:false, useRandomReturns:false, survivalDraws:null });
}

// Monte Carlo runner with progress callback
async function runMonteCarlo(inputs, runs = 1000, progressCb = null, options = {}) {
  // options: stochasticInflation=true/false, includeShocks=true/false, survivalProbabilistic=true/false
  const outcomes = [];
  const paths = [];
  for(let i=0;i<runs;i++){
    // For probabilistic survival we don't need precomputed survivalDraws; simulate inside
    const rngOpts = {
      stochasticInflation: !!options.stochasticInflation,
      shocks: !!options.includeShocks,
      useRandomReturns: true,
      survivalDraws: null
    };
    const r = simulatePath(inputs, rngOpts);
    outcomes.push(r.finalBalance);
    paths.push(r.balances);

    if(progressCb && i % Math.max(1, Math.floor(runs/100))===0) {
      progressCb(i+1, runs);
      // yield
      await new Promise(res => setTimeout(res, 0));
    }
  }
  outcomes.sort((a,b)=>a-b);
  return { outcomes, paths };
}
