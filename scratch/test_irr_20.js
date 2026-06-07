const timeline = [];
let totalInvested = 0;
let date = new Date("2006-06-05");

for (let i = 0; i < 20 * 365.25; i++) {
  const currentMonth = date.getUTCMonth();
  if (i === 0 || date.getUTCDate() === 1) {
    totalInvested += 500;
  }
  
  timeline.push({
    date: date.toISOString().slice(0, 10),
    totalInvested: totalInvested,
  });
  
  date.setDate(date.getDate() + 1);
}

const finalWealth = 575225;

const calculateDcaIrr = (subTimeline, finalWealth) => {
  if (!subTimeline || subTimeline.length <= 1 || finalWealth <= 0) return 0;
  const endDateObj = new Date(subTimeline[subTimeline.length - 1].date);
  
  const deposits = [];
  let prevInvested = 0;
  for (let i = 0; i < subTimeline.length; i++) {
    const currentInvested = subTimeline[i].totalInvested;
    const depositAmount = currentInvested - prevInvested;
    if (depositAmount > 0) {
      const depDate = new Date(subTimeline[i].date);
      const diffYears = Math.max(0, (endDateObj - depDate) / (1000 * 60 * 60 * 24 * 365.25));
      deposits.push({ amount: depositAmount, t: diffYears });
    }
    prevInvested = currentInvested;
  }

  console.log("Number of deposits:", deposits.length);
  console.log("Total invested:", prevInvested);

  let low = -0.99;
  let high = 5.0;  
  for (let iter = 0; iter < 40; iter++) {
    const R = (low + high) / 2;
    let fv = 0;
    for (const dep of deposits) {
      fv += dep.amount * Math.pow(1 + R, dep.t);
    }
    if (fv < finalWealth) {
      low = R;
    } else {
      high = R;
    }
  }
  return ((low + high) / 2) * 100;
};

console.log("Solved Annualized Rate:", calculateDcaIrr(timeline, finalWealth).toFixed(2) + "%");
