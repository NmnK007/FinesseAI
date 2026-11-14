import type { Assessment } from './assessment';

export function explainHealthIndex(card:Assessment,locale:'en'|'hi'='en'){
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
 if(locale==='hi'){
  const amount=new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR'}).format(overdue/100);
  return `आपका वर्णनात्मक सूचकांक ${card.overall}/1000 है। इसे अच्छा या बुरा बताने की प्रमाणित सीमा नहीं है; यह ब्यूरो स्कोर या चूक की संभावना नहीं है।\n\nसबसे मजबूत पक्ष ${best.label} (${best.score}/1000) है। ${hi[best.key]||'यह इस गणना का सबसे मजबूत उपलब्ध आयाम है।'}\n\nध्यान देने योग्य पक्ष ${weak.label} (${weak.score}/1000) है। ${hi[weak.key]||'यह इस गणना का सबसे कम उपलब्ध आयाम है।'}\n\nअगला कदम: ${suggestions[weak.key]?.[1]||'संबंधित रिकॉर्ड और कवरेज जाँचें।'}${overdue>0?`\n\nअपलोड चालानों में मालिक द्वारा बताई गई बकाया बिक्री राशि ${amount} है; यह बैंक से सत्यापित नहीं है।`:''}\n\nयह परिणाम केवल उपलब्ध, अप्रमाणित रिकॉर्ड का वर्णन करता है। रिकॉर्ड की पूर्णता जाँचें; यह ऋण निर्णय नहीं है।`;
 }
 const amount=new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR'}).format(overdue/100);
 return `Your descriptive index is ${card.overall}/1000. There is no validated good/bad cutoff for this index; it is not a bureau score or probability of default.\n\nStrongest area: ${best.label}, ${best.score}/1000. ${top}\n\nArea to review first: ${weak.label}, ${weak.score}/1000. ${low}\n\nSuggested next step: ${suggestions[weak.key]?.[0]||'Review the source records and coverage for this dimension.'}${overdue>0?`\n\nThe uploaded invoices report ${amount} in owner-declared overdue sales receivables. These amounts are not bank-verified.`:''}\n\nThis describes the available, unverified records only. Check that the source records are complete; this is not a lending decision.`;
}
