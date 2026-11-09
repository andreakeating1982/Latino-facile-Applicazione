import { chromium, webkit } from 'playwright';
import fs from 'node:fs/promises';
import superjson from 'superjson';

// Cornice reale in locale, testo e risposte sintetici, nessun dato utente.
// Simula anche l'arrivo tardivo dei font e l'apertura/chiusura dei pannelli.
const base = process.env.HEIGHT_TRANSITIONS_URL || 'http://127.0.0.1:3000';
const output = process.env.HEIGHT_TRANSITIONS_OUTPUT || '/tmp/latino-height-transitions';
const engines = (process.env.HEIGHT_TRANSITIONS_ENGINES || 'chromium,webkit').split(',');
const frameFile = process.env.HEIGHT_TRANSITIONS_FRAME || 'cornice-dinamica/embed-latino-facile-blog-v4.html';
const source = await fs.readFile(frameFile, 'utf8');
const expectedUrl = "var APP_URL = 'https://latino-facile-app-2.easy-peasy.site/';";
if (!source.includes(expectedUrl)) throw new Error('URL della cornice non trovato: prova interrotta.');
const html = source.replace(expectedUrl, `var APP_URL = '${base}/app';`);
await fs.mkdir(output, { recursive: true });
const tokens = ['Puella', 'rosam', 'videt'].map(word => ({
  text: word, word, trailing: '', isPunct: false,
  analysis: { word, display: word, options: [{lemma:word,form:word,summary:'',translation:'',freq:1,raw:'',desc:'nome',pos:'nome',case:'nominativo',number:'singolare'}], selected:0, category:'nome', color:'#FFC742', label:'nome', source:'manuale', number:'singolare' }
}));
const sentences = [{tokens}];
const results=[];
for (const engine of engines) {
 const browser = await {chromium,webkit}[engine].launch({headless:true,...(engine==='chromium'?{args:['--no-sandbox','--disable-features=LocalNetworkAccessChecks']}:{})});
 try {
  for (const s of [{name:'320',width:320,height:700,scale:1,delay:0},{name:'390-large-font-lento',width:390,height:844,scale:1.6,delay:1800}]) {
   const context=await browser.newContext({viewport:{width:s.width,height:s.height},isMobile:true,hasTouch:true});
   const page=await context.newPage(), record={engine,scenario:s.name,checks:[],ok:false};
   const errors=[]; page.on('pageerror',e=>errors.push(e.message)); let fontRequests=0;
   const check=(name,ok,detail)=>{record.checks.push({name,ok:!!ok,detail});if(!ok)throw new Error(`${name}: ${JSON.stringify(detail)}`);};
   await context.addInitScript(scale=>{try{localStorage.setItem('lf_access',JSON.stringify({fontScale:scale,lineHeight:1.65,ruler:false,mode:'normale'}));}catch{}},s.scale);
   await page.route('**/fonts/*',async route=>{fontRequests++;if(s.delay)await new Promise(r=>setTimeout(r,s.delay));await route.continue().catch(()=>{});});
   await page.route('**/api/trpc/**',route=>{
    const u=new URL(route.request().url());const paths=u.pathname.split('/api/trpc/')[1].split(',');
    const data=paths.map(p=>({result:{data:superjson.serialize(p==='latino.analyze'?{sentences,unknownWords:[],apiUsed:false,colorSource:'regole'}:p==='latino.translate'?{coloredSentences:sentences,lines:['La ragazza vede la rosa.'],source:'ai',colorSource:'ai'}:null)}}));
    return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(u.searchParams.get('batch')==='1'?data:data[0])});
   });
   await page.route('http://localhost:3000/__height_transitions',route=>route.fulfill({contentType:'text/html',body:`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0"><header style="height:70px">Blog di prova</header>${html}<footer style="height:200px">Fine</footer></body></html>`}));
   try {
    await page.goto('http://localhost:3000/__height_transitions',{waitUntil:'domcontentloaded'});
    const frame=page.frameLocator('iframe.lf-iframe');
    await frame.locator('textarea').waitFor();
    await frame.locator('textarea').evaluate(()=>document.fonts.ready);
    const measure=async()=>{
     const iframe=await page.locator('iframe.lf-iframe').evaluate(el=>el.getBoundingClientRect().height);
     const inner=await frame.locator('#root').evaluate(el=>({bottom:el.getBoundingClientRect().bottom+scrollY,viewport:innerHeight,scrollY,overflow:document.documentElement.scrollWidth-innerWidth}));
     return {iframe,...inner};
    };
    async function settled(){
     let m;for(let i=0;i<20;i++){
      await page.waitForTimeout(250);m=await measure();
      if(m.iframe>=m.bottom-1&&m.iframe<=Math.max(400,m.bottom)+24&&m.overflow<=1)return m;
     }return m;
    }
    const initial=await settled();check('pagina iniziale interamente contenuta senza vuoti eccessivi',initial.iframe>=initial.bottom-1&&initial.iframe<=Math.max(400,initial.bottom)+24&&initial.overflow<=1,initial);
    check('font auto-ospitati richiesti',fontRequests>0,{fontRequests,delay:s.delay});
    await frame.locator('textarea').fill('Puella rosam videt.');
    await frame.getByRole('button',{name:/Colora la frase con l.intelligenza artificiale/i}).click();
    await frame.locator('.chip-word').first().waitFor();
    const colored=await settled();check('risultato completamente visibile nella cornice',colored.iframe>=colored.bottom-1&&colored.iframe<=Math.max(400,colored.bottom)+24&&colored.overflow<=1,colored);
    const legend=await frame.locator('[role=list]').evaluate(grid=>{
     const issues=[],lines=[];
     for(const item of grid.querySelectorAll('[role=listitem]')){
      const itemBox=item.getBoundingClientRect();
      for(const el of item.querySelectorAll('div')){
       if(!el.textContent?.trim()||el.children.length)continue;
       const range=document.createRange();range.selectNodeContents(el);const rect=range.getBoundingClientRect();
       const cs=getComputedStyle(el);const lh=parseFloat(cs.lineHeight)||parseFloat(cs.fontSize);
       if(el.scrollWidth>el.clientWidth+1||rect.right>itemBox.right+1)issues.push(`fuori colonna: ${el.textContent.trim()}`);
       if(rect.height>lh*1.6)issues.push(`su più righe: ${el.textContent.trim()}`);
       lines.push({item:[...grid.querySelectorAll('[role=listitem]')].indexOf(item),text:el.textContent.trim(),left:rect.left,right:rect.right,top:rect.top,bottom:rect.bottom});
      }
     }
     for(let a=0;a<lines.length;a++)for(let b=a+1;b<lines.length;b++){
      const x=lines[a],y=lines[b];if(x.item===y.item)continue;
      if(Math.min(x.right,y.right)-Math.max(x.left,y.left)>1&&Math.min(x.bottom,y.bottom)-Math.max(x.top,y.top)>1)issues.push(`sovrapposizione: ${x.text} / ${y.text}`);
     }
     return {count:lines.length,issues};
    });
    check('legenda senza righe spezzate, sovrapposte o fuori colonna',legend.count>0&&legend.issues.length===0,legend);
    await frame.getByRole('button',{name:'MOSTRA TRADUZIONE'}).click();
    await frame.getByText('Traduzione in italiano',{exact:true}).waitFor();
    const shown=await settled();check('apertura traduzione espande la cornice',shown.iframe>colored.iframe&&shown.iframe>=shown.bottom-1&&shown.overflow<=1,{colored,shown});
    await frame.getByRole('button',{name:'SCRIVI LA TRADUZIONE'}).click();
    await frame.getByLabel('Traduzione della frase 1').waitFor();
    const writing=await settled();check('campi di traduzione interamente visibili',writing.iframe>shown.iframe&&writing.iframe>=writing.bottom-1&&writing.overflow<=1,{shown,writing});
    await frame.getByRole('button',{name:'CHIUDI I CAMPI'}).click();
    await frame.getByRole('button',{name:'NASCONDI TRADUZIONE'}).click();
    const hidden=await settled();check('chiusura pannelli restringe la cornice',hidden.iframe<writing.iframe&&hidden.iframe>=hidden.bottom-1&&hidden.iframe<=Math.max(400,hidden.bottom)+24,{writing,hidden});
    await page.waitForTimeout(1500);const later=await measure();
    check('altezza stabile dopo le transizioni',Math.abs(later.iframe-hidden.iframe)<=8&&later.iframe>=later.bottom-1,{hidden,later});
    check('nessun errore JavaScript',errors.length===0,errors);
    await page.screenshot({path:`${output}/${engine}-${s.name}.png`,fullPage:true});
    record.ok=true;
   } catch(e){record.error=String(e);await page.screenshot({path:`${output}/${engine}-${s.name}-FAIL.png`,fullPage:true}).catch(()=>{});}
   console.log(JSON.stringify(record));results.push(record);await context.close();
  }
 } finally {await browser.close();}
}
await fs.writeFile(`${output}/results.json`,JSON.stringify(results,null,2));
console.log(`SCENARI ${results.filter(r=>r.ok).length}/${results.length}; CONTROLLI ${results.flatMap(r=>r.checks).filter(c=>c.ok).length}/${results.flatMap(r=>r.checks).length}`);
if(results.some(r=>!r.ok))process.exitCode=1;

