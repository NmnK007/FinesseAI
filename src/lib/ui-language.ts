import hi from '../data/i18n/hi.json';
const dictionary=hi as Record<string,string>;
export function translate(value:string,language:string){
 if(language!=='hi')return value;
 const key=value.replace(/\s+/g,' ').trim();
 let result=dictionary[key];
 if(!result){
  const buyer=key.match(/^One declared buyer accounts for (\d+)% of supplied invoice sales\.$/);
  const gap=key.match(/^Declared sales and classified bank receipts differ by more than 30% in (\d{4}-\d{2})\.$/);
  if(buyer)result=`एक घोषित ग्राहक दिए गए बिक्री चालानों की राशि के ${buyer[1]}% का हिस्सा है।`;
  if(gap)result=`${gap[1]} में घोषित बिक्री और वर्गीकृत बैंक प्राप्तियों में 30% से अधिक अंतर है।`;
 }
 return result?(value.startsWith(' ')?' ':'')+result+(value.endsWith(' ')?' ':''):value;
}
