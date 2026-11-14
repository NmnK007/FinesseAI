export async function request(path:string,body?:unknown){
 const res=await fetch(path,body?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{cache:'no-store'});
 const data=await res.json();if(!res.ok)throw new Error(data.error?.message||'Request failed');return data;
}
