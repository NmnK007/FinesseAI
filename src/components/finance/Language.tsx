'use client';
import { createContext,useContext,useEffect,useState,type ReactNode } from 'react';
import { translate } from '@/lib/ui-language';
const Context=createContext({language:'en',setLanguage:(_value:string)=>{},t:(text:string)=>text});
export function useLanguage(){return useContext(Context);}
export function T({children}:{children:ReactNode}){const {t}=useLanguage();return <>{typeof children==='string'?t(children):children}</>;}
export function LanguageProvider({children}:{children:ReactNode}){
 const [language,setLanguage]=useState('en'),[ready,setReady]=useState(false);
 useEffect(()=>{try{const saved=localStorage.getItem('finnese-language');if(saved==='hi')setLanguage(saved);}catch{}setReady(true);},[]);
 useEffect(()=>{if(!ready)return;document.documentElement.lang=language;try{localStorage.setItem('finnese-language',language);}catch{}},[language,ready]);
 const t=(value:string)=>translate(value,language);
 return <Context.Provider value={{language,setLanguage,t}}><div className="flex flex-wrap items-center justify-between gap-2 bg-white px-5 py-2 text-sm text-black"><a className="underline" href="#main-content">{t('Skip to main content')}</a><label>{t('Language')} <select aria-label={t('Language')} className="rounded border border-black bg-white px-2 py-1" value={language} onChange={e=>setLanguage(e.target.value)}><option value="en">English</option><option value="hi">हिन्दी</option></select></label></div>{children}</Context.Provider>;
}
