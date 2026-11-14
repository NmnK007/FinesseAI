import type { intelligenceStore } from './db/intelligence';
import type { observedBaseline } from './finance/scenario';
import { formatPaise } from './finance/money';
export function hindiAnswer(tool:string,data:Awaited<ReturnType<ReturnType<typeof intelligenceStore>['read']>>,alertCount:number,baseline:ReturnType<typeof observedBaseline>,citations:string[]){
 if(tool==='getHealthCard'){let answer=data.current.overall===null?'आवश्यक लागू रिकॉर्ड, लगातार चालान महीने या नया बैंक डेटा न होने के कारण वित्तीय सूचकांक उपलब्ध नहीं है। यह ऋण अस्वीकृति नहीं है।':`वित्तीय सूचकांक ${data.current.overall}/1000 है। यह वर्णनात्मक सूचकांक है, ब्यूरो स्कोर या चूक की संभावना नहीं।`;const [latest,previous]=data.history;if(latest&&previous&&latest.result.overall!==null&&previous.result.overall!==null)answer+=` नवीनतम सहेजे आकलन में ${latest.result.overall-previous.result.overall} अंक का बदलाव है।`;return answer;}
 if(tool==='getOutstandingInvoices')return `मालिक द्वारा बताई गई बकाया बिक्री प्राप्तियाँ ${formatPaise(data.current.overdueReceivablesPaise)} हैं। भुगतान राशियाँ अप्रमाणित घोषणाएँ हैं; बैंक मिलान और नकद निपटान जाँचें।`;
 if(tool==='getFraudAlerts')return `उपलब्ध रिकॉर्ड पर ${alertCount} समीक्षा संकेत मिले। संबंधित रिकॉर्ड और वैकल्पिक कारण ट्रस्टगार्ड में देखें। संकेत धोखाधड़ी का प्रमाण नहीं हैं।`;
 if(tool==='getCashFlow')return baseline.monthlyReceiptsPaise===null?'पूर्ण महीनों के बैंक रिकॉर्ड उपलब्ध नहीं हैं।':`दिए गए महीनों में औसत परिचालन प्राप्तियाँ ${formatPaise(baseline.monthlyReceiptsPaise)} और खर्च ${formatPaise(baseline.monthlyCostsPaise!)} हैं। ${baseline.unknownTransactions} लेन-देन अवर्गीकृत हैं। रिकॉर्ड अधूरे हो सकते हैं; यह पूर्वानुमान नहीं है।`;
 if(tool==='getModelStatus')return 'मॉडल केवल प्रदर्शन के लिए है और वास्तविक एमएसएमई ऋण निर्णय के लिए प्रमाणित नहीं है।';
 const knowledge:Record<string,string>={
 'knowledge:dscr':'डीएससीआर ऋण भुगतान के लिए उपलब्ध नकदी को ऋण भुगतान से भाग देकर निकाला जाता है। ऋण भुगतान शून्य या देनदारियाँ अधूरी होने पर यह उपलब्ध नहीं है। यह ऋण निर्णय नहीं है।',
 'knowledge:health-methodology':'आंतरिक वित्तीय सूचकांक चालान स्थिरता, दाखिले और भुगतान के समयपालन, ग्राहक विविधता और देखी गई वृद्धि का वर्णन करता है। आवश्यक रिकॉर्ड न होने पर स्कोर नहीं बनता।',
 'knowledge:cash-and-revenue':'बैंक जमा में पूँजी, ऋण और आंतरिक हस्तांतरण हो सकते हैं। केवल वर्गीकृत बिक्री परिचालन प्राप्तियों में आती है। समय, कर कटौती और अधूरे खातों से चालान और नकदी में अंतर हो सकता है।',
 'knowledge:consent':'अपलोड रिकॉर्ड अप्रमाणित हैं। सहमति समाप्त होने या वापस लेने पर उनका उपयोग बंद होता है। स्रोत उपलब्धता अनुमान का भरोसा नहीं है।',
 'knowledge:scenarios':'परिदृश्य धारणाओं पर आधारित हैं। ईएमआई मूलधन, नाममात्र दर और अवधि से निकलती है; शुल्क और कुल भुगतान अलग दिखते हैं। देरी और बिक्री गिरावट प्राप्तियों को बदलती हैं।'
 };
 return citations.map(c=>knowledge[c]).filter(Boolean).join('\n\n')||'इस प्रश्न का उत्तर उपलब्ध उपकरणों से नहीं मिला। सूचकांक, नकदी, बकाया, समीक्षा संकेत या डीएससीआर के बारे में पूछें।';
}
