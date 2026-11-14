import demoModels from '@/data/demo/models.json';
/** Synthetic illustrative approval heuristic only; not observed approvals or PD.
 * Online inference reads committed weights. trainDemoModel is invoked offline.
 * These invented profiles do not describe any real bank's underwriting policy.
 */

export type LenderKey = "Illustrative lender A" | "Illustrative lender B" | "Illustrative lender C";

export type Features = readonly [
  revenue: number,
  compliance: number,
  counterparty: number,
  growth: number,
  amountRatio: number,
  tenor: number,
];

const LABEL_HEURISTICS: Record<
  LenderKey,
  { wRev: number; wComp: number; wCtr: number; wGro: number; wAmt: number; wTen: number; bias: number }
> = {
  "Illustrative lender A": { wRev: 3.2, wComp: 2.4, wCtr: 1.8, wGro: 2.0, wAmt: -1.5, wTen: -0.3, bias: -3.2 },
  "Illustrative lender B":         { wRev: 2.4, wComp: 3.8, wCtr: 2.6, wGro: 1.4, wAmt: -1.8, wTen: -0.4, bias: -3.5 },
  "Illustrative lender C": { wRev: 2.6, wComp: 2.2, wCtr: 2.0, wGro: 2.4, wAmt: -1.6, wTen: -0.2, bias: -3.0 },
};

const sigmoid = (z: number) => 1 / (1 + Math.exp(-z));

function seededRand(seed = 42) {
  let state = seed >>> 0 || 1;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

function normalize(rev: number, comp: number, ctr: number, gro: number, amt: number, ten: number): Features {
  return [rev / 1000, comp / 1000, ctr / 1000, gro / 1000, Math.min(1, amt), Math.min(1, ten / 60)];
}

function generateSample(lender: LenderKey, rnd: () => number): { features: Features; label: number } {
  const rev = 250 + rnd() * 750;
  const comp = 250 + rnd() * 750;
  const ctr = 250 + rnd() * 750;
  const gro = 250 + rnd() * 750;
  const amt = 0.05 + rnd() * 0.45;
  const ten = 12 + rnd() * 48;

  const h = LABEL_HEURISTICS[lender];
  const linear =
    h.bias +
    h.wRev * (rev / 1000) +
    h.wComp * (comp / 1000) +
    h.wCtr * (ctr / 1000) +
    h.wGro * (gro / 1000) +
    h.wAmt * amt +
    h.wTen * (ten / 60);
  const noise = (rnd() - 0.5) * 0.6;
  const label = rnd() < sigmoid(linear + noise) ? 1 : 0;

  return { features: normalize(rev, comp, ctr, gro, amt, ten), label };
}

export type TrainedModel = {
  lender: LenderKey;
  weights: number[]; // [bias, w1..w6]
  accuracy: number;
  auc: number;
  sampleCount: number;
  epochsRun: number;
};

export function trainDemoModel(lender: LenderKey, N = 2400, epochs = 260, lr = 0.35): TrainedModel {
  const rnd = seededRand(lender.length * 7919 + 1);
  const samples = Array.from({ length: N }, () => generateSample(lender, rnd));

  let w = [0, 0, 0, 0, 0, 0, 0];
  for (let e = 0; e < epochs; e++) {
    const g = [0, 0, 0, 0, 0, 0, 0];
    for (const s of samples) {
      const z = w[0] + s.features[0] * w[1] + s.features[1] * w[2] + s.features[2] * w[3] +
                s.features[3] * w[4] + s.features[4] * w[5] + s.features[5] * w[6];
      const err = sigmoid(z) - s.label;
      g[0] += err;
      for (let i = 0; i < 6; i++) g[i + 1] += err * s.features[i];
    }
    for (let i = 0; i < 7; i++) w[i] -= (lr * g[i]) / N;
  }

  // holdout evaluation
  const holdout = Array.from({ length: 600 }, () => generateSample(lender, rnd));
  let correct = 0;
  const scored: { p: number; y: number }[] = [];
  for (const s of holdout) {
    const z = w[0] + s.features[0] * w[1] + s.features[1] * w[2] + s.features[2] * w[3] +
              s.features[3] * w[4] + s.features[4] * w[5] + s.features[5] * w[6];
    const p = sigmoid(z);
    scored.push({ p, y: s.label });
    if ((p >= 0.5 ? 1 : 0) === s.label) correct++;
  }

  // AUC via Mann-Whitney U
  const pos = scored.filter((s) => s.y === 1);
  const neg = scored.filter((s) => s.y === 0);
  let wins = 0;
  for (const p of pos) for (const n of neg) if (p.p > n.p) wins++; else if (p.p === n.p) wins += 0.5;
  const auc = pos.length && neg.length ? wins / (pos.length * neg.length) : 0.5;

  return {
    lender,
    weights: w,
    accuracy: correct / holdout.length,
    auc,
    sampleCount: N,
    epochsRun: epochs,
  };
}

const cache: Partial<Record<LenderKey, TrainedModel>> = {};

function isLenderKey(l: string): l is LenderKey {
  return l in LABEL_HEURISTICS;
}

export function getModel(lender: string): TrainedModel {
  const key = isLenderKey(lender) ? lender : "Illustrative lender A";
  if (!cache[key]) {
    const artifact = demoModels.models.find(model => model.lender === key);
    if (!artifact || artifact.weights.length !== 7 || demoModels.featureVersion !== 'legacy-six-v1') throw new Error('Incompatible demo model artifact');
    cache[key] = artifact as TrainedModel;
  }
  return cache[key]!;
}

export type ApprovalPrediction = {
  probability: number;
  features: Features;
  contributions: { name: string; weight: number; value: number; contrib: number }[];
  model: TrainedModel;
};

const FEATURE_NAMES = ["Revenue Stability", "Compliance", "Counterparty", "Growth", "Amount Ratio", "Tenor"];

export function predictApproval(
  lender: string,
  subs: { revenue: number; compliance: number; counterparty: number; growth: number },
  amountRatio: number,
  tenorMonths: number
): ApprovalPrediction {
  const model = getModel(lender);
  const f = normalize(subs.revenue, subs.compliance, subs.counterparty, subs.growth, amountRatio, tenorMonths);
  const [b, w1, w2, w3, w4, w5, w6] = model.weights;
  const contribs = [w1, w2, w3, w4, w5, w6].map((w, i) => ({
    name: FEATURE_NAMES[i],
    weight: w,
    value: f[i],
    contrib: w * f[i],
  }));
  const z = b + contribs.reduce((s, c) => s + c.contrib, 0);
  return {
    probability: sigmoid(z),
    features: f,
    contributions: contribs,
    model,
  };
}

export function getAllModels(): TrainedModel[] {
  return (Object.keys(LABEL_HEURISTICS) as LenderKey[]).map(getModel);
}
