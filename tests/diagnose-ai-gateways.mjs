#!/usr/bin/env node
/* Diagnosi esplicita dei due gateway IA del progetto, senza mostrare chiavi,
   prompt, risultati generati o dati personali. Non è eseguita dalla CI. */
import 'dotenv/config';
if (!process.argv.includes('--real')) {
  console.log('Per una diagnosi reale e deliberata, passare --real.');
  process.exit(0);
}
const key=process.env.EASY_PEASY_API_KEY;
if (!key) { console.log(JSON.stringify({configured:false})); process.exitCode=1; }
else {
  const prompt='Rispondi solo con OK.';
  const tests=[
    {name:'template',url:'https://easy-peasy.ai/api/generate', headers:{'Content-Type':'application/json','x-api-key':key}, body:{preset:'custom-generator',keywords:prompt,tone:'neutral',length:'Short',language:'Italian',outputs:1}},
    {name:'chat',url:'https://easy-peasy.ai/api/chat/completions',headers:{'Content-Type':'application/json',Authorization:`Bearer ${key}`},body:{model:'gemini-3-flash',messages:[{role:'user',content:prompt}],max_tokens:2500,temperature:0.2}},
  ];
  const out=[];
  for(const t of tests.filter(t=>!process.argv.includes('--template-only')||t.name==='template')){
    const started=Date.now();
    try {
      const res=await fetch(t.url,{method:'POST',headers:t.headers,body:JSON.stringify(t.body),signal:AbortSignal.timeout(35_000)});
      const raw=await res.text();
      let data; try{data=JSON.parse(raw);}catch{data=null;}
      const shape=(v,depth=0)=> {
        if(depth>2) return typeof v;
        if(Array.isArray(v)) return {kind:'array',length:v.length,sample:v.length?shape(v[0],depth+1):null};
        if(v&&typeof v==='object') return Object.fromEntries(Object.entries(v).map(([k,x])=>[k,shape(x,depth+1)]));
        return typeof v==='string'?`string(${v.length})`:typeof v;
      };
      const safe={gateway:t.name,status:res.status,ok:res.ok,ms:Date.now()-started,validJson:data!==null,responseShape:shape(data)};
      if(res.ok) {
        safe.outputPresent=t.name==='chat'?!!data?.choices?.[0]?.message?.content:!!data?.[0]?.name;
      } else {
        const msg=String(data?.error?.message??data?.error??data?.message??raw).replaceAll(key,'[REDACTED]');
        safe.errorCategory=/not found|unknown model|unsupported model/i.test(msg)?'model_not_found': /invalid.*key|unauthori[sz]ed|authentication/i.test(msg)?'authentication': /quota|limit|rate/i.test(msg)?'limit_or_rate': /forbidden|permission|access/i.test(msg)?'permission': 'other';
        safe.message=msg.replace(/[\r\n]+/g,' ').replace(/(?:Bearer\s+)?[A-Za-z0-9_-]{32,}/g,'[REDACTED]').slice(0,240);
      }
      out.push(safe);
    } catch(err){out.push({gateway:t.name,ok:false,ms:Date.now()-started,errorCategory:err?.name??'network_error'});}
  }
  console.log(JSON.stringify({configured:true,results:out},null,2));
}

