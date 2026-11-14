import type { Assessment } from './assessment';

export function explainLoanReadiness(card:Assessment,locale:'en'|'hi'){
 const hindi=locale==='hi';
 const labels:Record<string,string>={
  revenue:'राजस्व स्थिरता',compliance:'दाखिले और भुगतान का समयपालन',
  counterparty:'ग्राहक विविधता',growth:'देखी गई बिक्री वृद्धि'
 };
 const label=(domain:Assessment['dimensions'][number])=>hindi?labels[domain.key]??domain.label:domain.label;
 const scored=card.dimensions.filter(domain=>domain.score!==null).sort((a,b)=>b.score!-a.score!);
 const strongest=scored[0];
 const weakest=scored.at(-1);
 const scores=card.dimensions.map(domain=>{
  const score=domain.score===null?(hindi?'उपलब्ध नहीं':'Unavailable'):`${domain.score}/1000`;
  return `• ${label(domain)} (${Math.round(domain.weight*100)}%) — ${score}`;
 });
 const overall=card.overall===null?(hindi?'उपलब्ध नहीं':'unavailable'):`${card.overall}/1000`;
 const opening=hindi?`मेरी राय में, शायद। ऋणदाता अपने मानदंड, नकदी प्रवाह और मौजूदा कर्ज की समीक्षा करेगा। आपका वित्तीय स्थिति सूचकांक ${overall} है।`:
  `My take: maybe. A lender will assess your cash flow, existing debt and its own eligibility criteria. Your Financial Health Index is ${overall}.`;
 const strength=strongest?(hindi?`आवेदन में ${label(strongest)} (${strongest.score}/1000) को पहले दिखाएँ। उपलब्ध स्कोर में यह आपका सबसे मजबूत पक्ष है।`:
  `Lead with ${label(strongest)} (${strongest.score}/1000) in the lender conversation. It is your strongest scored domain.`):
  (hindi?'पहले लागू बैंक, चालान और अनुपालन रिकॉर्ड जोड़ें।':'Start by adding the applicable bank, invoice and compliance records.');
 const next=card.overall===null&&strongest
  ?(hindi?'आवेदन से पहले उन आयामों के रिकॉर्ड पूरे करें जिनका स्कोर उपलब्ध नहीं है।':'Before applying, fill the evidence gaps for the domains marked unavailable.')
  :weakest&&weakest.score!==strongest?.score
    ?(hindi?`पहले ${label(weakest)} (${weakest.score}/1000) के रिकॉर्ड की समीक्षा करें।`:
     `Review the evidence for ${label(weakest)} (${weakest.score}/1000) first. It is your lowest scored domain.`):'';
 return [opening,scores.join('\n'),strength,next].filter(Boolean).join('\n\n');
}

export function isLoanReadinessQuestion(question:string){
 return /\b(loans?|financing|funding|borrow(?:ing)?|credit)\b|ऋण|लोन|कर्ज़?|karz/i.test(question) &&
  /\b(get|qualif\w*|eligib\w*|approv\w*|chances?|likely|can|could|will|ready|readiness|mil\w*|mujhe|mai|kya)\b|मिल|पात्र|योग्य|संभावना|मंज़?ूर/i.test(question);
}

export function explainHealthIndex(card:Assessment,locale:'en'|'hi'='en',question='',change?:number|null){
 const scored=card.dimensions.filter((d):d is typeof d&{score:number}=>d.score!==null);
 if(card.overall===null)return locale==='hi'
  ?'सूचकांक अभी उपलब्ध नहीं है। पहले लागू रिकॉर्ड, लगातार तीन चालान महीनों और देय अनुपालन रिकॉर्ड की कमी देखें। अनुपस्थित डेटा का अनुमान नहीं लगाया जाता; यह खराब स्कोर या ऋण अस्वीकृति नहीं है।'
  :'The index is unavailable, so there is no score to call good or bad. Check which applicable records, three consecutive invoice months, or due compliance records are missing. Missing data is not estimated and is not a negative score or loan rejection.';
 const best=[...scored].sort((a,b)=>b.score-a.score)[0],weak=[...scored].sort((a,b)=>a.score-b.score)[0];
 const en:Record<string,string>={
  revenue:'Revenue stability summarizes variation in supplied invoice sales across the observed consecutive months.',
  compliance:'Filing and payment timeliness summarizes the due GST filings and utility bills present in the uploaded records.',
  counterparty:'Customer diversification reflects how much of supplied invoice sales is concentrated with the largest declared customer.',
  growth:'Observed sales growth compares the earliest and latest observed invoice months; it is not a forecast.'
 };
 const hi:Record<string,string>={
  revenue:'राजस्व स्थिरता उपलब्ध लगातार महीनों के चालान बिक्री में उतार-चढ़ाव दिखाती है।',
  compliance:'दाखिला और भुगतान समयपालन अपलोड रिकॉर्ड में उपलब्ध देय जीएसटी दाखिलों और बिजली बिलों का सार है।',
  counterparty:'ग्राहक विविधता बताती है कि घोषित सबसे बड़े ग्राहक पर चालान बिक्री कितनी निर्भर है।',
  growth:'देखी गई बिक्री वृद्धि शुरुआती और नवीनतम उपलब्ध चालान महीनों की तुलना है; यह पूर्वानुमान नहीं है।'
 };
 const suggestions:Record<string,[string,string]>={
  revenue:['Check the monthly invoice totals for missing months or one-off invoices, then review whether the observed variation matches your records.','छूटे महीनों या एकबारगी चालानों के लिए मासिक चालान राशि जाँचें और देखें कि उतार-चढ़ाव रिकॉर्ड से मेल खाता है या नहीं।'],
  compliance:['Review each due GST filing or utility bill marked late or unpaid; correct source records if needed.','देर से या अवैतनिक दिख रहे देय जीएसटी दाखिले या बिजली बिल जाँचें; ज़रूरत हो तो स्रोत रिकॉर्ड सुधारें।'],
  counterparty:['Review the invoice share of the largest declared customer and monitor concentration; the app does not verify customer identity.','सबसे बड़े घोषित ग्राहक की चालान हिस्सेदारी जाँचें और निर्भरता पर नज़र रखें; ऐप ग्राहक की पहचान सत्यापित नहीं करता।'],
  growth:['Compare the first and latest invoice months, check that records are complete, and review invoice-to-bank collection matches and overdue amounts.','पहले और नवीनतम चालान महीनों की तुलना करें, रिकॉर्ड पूरे होने की जाँचें, और चालान-बैंक मिलान तथा बकाया राशि देखें।']
 };
 const top=en[best.key]||'This is the strongest observed dimension in the current calculation.';
 const low=en[weak.key]||'This is the lowest observed dimension in the current calculation.';
 const overdue=card.overdueReceivablesPaise;
 const q=question.toLowerCase();
 const asksToImprove=/improv|improvement|raise|increase|better|fix|work on|सुधार|बेहतर|बढ़ा|ठीक/.test(q);
 const asksChange=/why|change|changed|movement|क्यों|बदलाव|बदला/.test(q);
 if(locale==='hi'){
  const amount=new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR'}).format(overdue/100);
  if(asksToImprove)return `आपका वर्णनात्मक सूचकांक ${card.overall}/1000 है। इसे बढ़ाने का कोई प्रमाणित नुस्खा या ऋण सीमा नहीं है।\n\nपहले ${weak.label} (${weak.score}/1000) देखें। ${hi[weak.key]||'यह सबसे कम उपलब्ध आयाम है।'}\n\nकरने योग्य जाँच: ${suggestions[weak.key]?.[1]||'इस आयाम के स्रोत रिकॉर्ड और कवरेज जाँचें।'}${overdue>0?` अपलोड चालानों में ${amount} बकाया बताया गया है; यह बैंक से सत्यापित नहीं है।`:''}\n\nरिकॉर्ड सही और पूरे रखें। यह ऋण निर्णय नहीं है।`;
  if(asksChange)return `वर्तमान वर्णनात्मक सूचकांक ${card.overall}/1000 है।${change!=null?` पिछले सहेजे आकलन से ${change} अंक का बदलाव है।`:' पिछला सहेजा आकलन उपलब्ध नहीं है, इसलिए बदलाव की तुलना नहीं कर सकते।'}\n\nसबसे अधिक अंक ${best.label} (${best.score}) और सबसे कम ${weak.label} (${weak.score}) के हैं। ${hi[weak.key]||'सबसे कम आयाम के स्रोत रिकॉर्ड जाँचें।'}\n\nयह भारित वर्णनात्मक सूचकांक है, ब्यूरो स्कोर या चूक की संभावना नहीं।`;
  return `आपका वर्णनात्मक सूचकांक ${card.overall}/1000 है। इसे अच्छा या बुरा बताने की प्रमाणित सीमा नहीं है; यह ब्यूरो स्कोर या चूक की संभावना नहीं है।\n\nसबसे मजबूत पक्ष ${best.label} (${best.score}/1000) है। ${hi[best.key]||'यह इस गणना का सबसे मजबूत उपलब्ध आयाम है।'}\n\nध्यान देने योग्य पक्ष ${weak.label} (${weak.score}/1000) है। ${hi[weak.key]||'यह इस गणना का सबसे कम उपलब्ध आयाम है।'}\n\nअगला कदम: ${suggestions[weak.key]?.[1]||'संबंधित रिकॉर्ड और कवरेज जाँचें।'}${overdue>0?`\n\nअपलोड चालानों में मालिक द्वारा बताई गई बकाया बिक्री राशि ${amount} है; यह बैंक से सत्यापित नहीं है।`:''}\n\nयह परिणाम केवल उपलब्ध, अप्रमाणित रिकॉर्ड का वर्णन करता है। रिकॉर्ड की पूर्णता जाँचें; यह ऋण निर्णय नहीं है।`;
 }
 const amount=new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR'}).format(overdue/100);
 if(asksToImprove)return `Your descriptive index is ${card.overall}/1000. There is no validated recipe or lending cutoff for raising it.\n\nStart with ${weak.label} (${weak.score}/1000). ${low}\n\nWhat to check: ${suggestions[weak.key]?.[0]||'Review the source records and coverage for this dimension.'}${overdue>0?` The uploaded invoices report ${amount} overdue; this is owner-declared and not bank-verified.`:''}\n\nKeep records accurate and complete. This is not a lending decision.`;
 if(asksChange)return `Your current descriptive index is ${card.overall}/1000.${change!=null?` It changed by ${change} points from the previous saved assessment.`:' There is no previous saved assessment available for comparison yet.'}\n\nThe index combines the available dimensions with fixed weights. ${best.label} (${best.score}) is highest and ${weak.label} (${weak.score}) is lowest. ${low}\n\nSave a new assessment after correcting or adding records to compare. This is not a bureau score or probability of default.`;
 return `Your descriptive index is ${card.overall}/1000. There is no validated good/bad cutoff for this index; it is not a bureau score or probability of default.\n\nStrongest area: ${best.label}, ${best.score}/1000. ${top}\n\nArea to review first: ${weak.label}, ${weak.score}/1000. ${low}\n\nSuggested next step: ${suggestions[weak.key]?.[0]||'Review the source records and coverage for this dimension.'}${overdue>0?`\n\nThe uploaded invoices report ${amount} in owner-declared overdue sales receivables. These amounts are not bank-verified.`:''}\n\nThis describes the available, unverified records only. Check that the source records are complete; this is not a lending decision.`;
}
