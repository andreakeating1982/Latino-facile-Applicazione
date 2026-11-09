import { chromium, webkit } from 'playwright';
import fs from 'node:fs/promises';
import superjson from 'superjson';

// Flusso completo con dati sintetici e OCR/IA simulati: nessun dato reale.
// La regressione da prevenire è una scrollbar dell'iframe che interferisce
// con il lock del dialogo dopo aver prodotto una frase colorata.
const base=process.env.CROP_AFTER_BASE_URL??'http://127.0.0.1:3000';
const out=process.env.CROP_AFTER_OUTPUT??'/tmp/latino-crop-after-result';
const engines=(process.env.CROP_AFTER_ENGINES??'chromium,webkit').split(',');
await fs.mkdir(out,{recursive:true});
const photo=Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="900" height="1200"><rect width="900" height="1200" fill="#fffdf6"/><text x="60" y="120" font-size="46" fill="#222">Puella rosam videt.</text></svg>');
const words=['rosaeque','agricolaeque','puellarumve','puellisne','terrasque','amicique','nobiscum','amatne','incomprehensibilibusque'];
const tokens=words.map((word,index)=>{
  const suffisso=word.endsWith('cum')?'cum':word.endsWith('ve')?'ve':word.endsWith('ne')?'ne':'que';
  const option={lemma:word,form:word,summary:'',translation:'',freq:1,raw:'',desc:'nome',pos:'nome',case:'genitivo',number:'singolare'};
  return {text:word,word,trailing:'',isPunct:false,analysis:{word,display:word,options:[option],selected:0,category:'nome',color:index%2?'#FFCC80':'#FFC742',label:'nome',source:'manuale',number:'singolare',suffisso:{testo:suffisso,colore:'#4A4A4A'}}};
});
const sentences=[{tokens}];
const results=[];
for(const engine of engines){
 const browser=await {chromium,webkit}[engine].launch({headless:true,...(engine==='chromium'?{args:['--no-sandbox','--disable-features=LocalNetworkAccessChecks']}:{})});
 try{
  for(const s of [{name:'mobile-320',width:320,height:568},{name:'blog-320',width:320,height:568,embed:true},{name:'blog-390',width:390,height:844,embed:true}]){
   const context=await browser.newContext({viewport:{width:s.width,height:s.height},isMobile:true,hasTouch:true});
   const page=await context.newPage(),record={engine,scenario:s.name,checks:[],ok:false};
   const check=(name,ok,detail)=>{record.checks.push({name,ok:!!ok,detail});if(!ok)throw new Error(`${name}: ${JSON.stringify(detail)}`);};
   let uploads=0;const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await context.addInitScript(()=>{try{localStorage.setItem('lf_access',JSON.stringify({fontScale:1.6,lineHeight:1.65,ruler:false,mode:'normale'}));}catch{}});
   await page.route('**/api/trpc/**',route=>{
    const url=new URL(route.request().url()),paths=url.pathname.split('/api/trpc/')[1].split(',');
    const data=paths.map(path=>({result:{data:superjson.serialize(path==='latino.analyze'?{sentences,unknownWords:[],apiUsed:false,colorSource:'regole'}:path==='latino.translate'?{coloredSentences:sentences,lines:['Frase di prova.'],source:'ai',colorSource:'ai'}:null)}}));
    return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(url.searchParams.get('batch')==='1'?data:data[0])});
   });
   await page.route('**/api/ai/transcribe',route=>{uploads++;return route.fulfill({status:200,contentType:'application/json',body:'{"text":"Puella rosam videt."}'});});
   try{
    if(s.embed){
      await page.route('http://localhost:3000/__blog-crop-after-result',route=>route.fulfill({contentType:'text/html',body:`<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><style>body{margin:0}header{height:240px}iframe{display:block;border:0;width:calc(100% - 16px);margin:0 8px;height:1600px}</style><header>Blog di prova</header><iframe title="Latino Facile" src="${base}/app?cornice=crop-after-result"></iframe><footer style="height:1000px">Fine</footer><script>addEventListener('message',e=>{let f=document.querySelector('iframe');if(e.source===f.contentWindow&&e.data?.type==='labvisivo:height')f.style.height=Math.max(640,e.data.height)+'px'})</script>`}));
      await page.goto('http://localhost:3000/__blog-crop-after-result');
    }else await page.goto(base+'/app');
    const frame=s.embed?page.frames().find(f=>f.url().startsWith(base+'/app')):page.mainFrame();
    if(!frame)throw new Error('Iframe non trovato');
    await frame.locator('textarea').waitFor();await frame.evaluate(()=>document.fonts.ready);
    await frame.locator('textarea').fill(words.join(' '));
    const analyze=frame.getByRole('button',{name:/Colora la frase con l.intelligenza artificiale/i});
    await analyze.evaluate(el=>el.scrollIntoView({block:'center',behavior:'instant'}));
    if(s.embed){const r=await analyze.boundingBox();await page.evaluate(delta=>window.scrollBy({top:delta,behavior:'instant'}),r.y+r.height/2-s.height/2);}
    const analyzeRect=await analyze.boundingBox();await page.touchscreen.tap(analyzeRect.x+analyzeRect.width/2,analyzeRect.y+analyzeRect.height/2);
    await frame.locator('.chip-enclitic').first().waitFor();
    await frame.waitForFunction(()=>document.documentElement.classList.contains('lf-has-colored-result'));
    await page.waitForTimeout(1800);
    const before=await frame.evaluate(()=>({hasResult:document.documentElement.classList.contains('lf-has-colored-result'),overflow:getComputedStyle(document.documentElement).overflowY,locked:document.documentElement.hasAttribute('data-lf-crop-open')}));
    check('risultato colorato prima del ritaglio',before.hasResult&&!before.locked,before);
    check('corsia iframe riservata solo se incorporato',s.embed?before.overflow==='scroll':before.overflow!=='scroll',before);
    if(s.embed){
      const heights=await page.evaluate(()=>new Promise(resolve=>{const values=[];let n=0;const t=setInterval(()=>{values.push(Math.round(document.querySelector('iframe').getBoundingClientRect().height));if(++n===9){clearInterval(t);resolve(values)}},180)}));
      check('altezza iframe stabile dopo la colorazione',Math.max(...heights)-Math.min(...heights)<=1,heights);
      await page.evaluate(()=>window.scrollTo({top:290,behavior:'instant'}));
    }
    await frame.locator('input[type=file]').first().setInputFiles({name:'foto-sintetica.svg',mimeType:'image/svg+xml',buffer:photo});
    const dialog=frame.locator('[role=dialog]');await dialog.waitFor({state:'visible'});
    await frame.waitForFunction(()=>document.querySelector('[role=dialog] img')?.naturalWidth>0);
    await frame.waitForFunction(()=>{const d=document.querySelector('[role=dialog]');return d&&d.getAnimations().every(a=>a.playState!=='running')&&Math.abs(d.getBoundingClientRect().width-d.offsetWidth)<1.2;});
    await page.waitForTimeout(500);
    const locked=await frame.evaluate(()=>({hasResult:document.documentElement.classList.contains('lf-has-colored-result'),flag:document.documentElement.hasAttribute('data-lf-crop-open'),overflow:getComputedStyle(document.documentElement).overflowY,body:getComputedStyle(document.body).position}));
    check('lock del ritaglio prevale sulla corsia iframe',locked.hasResult&&locked.flag&&locked.overflow==='hidden'&&locked.body==='fixed',locked);
    const modal=await dialog.boundingBox(),footer=await frame.locator('[data-crop-footer]').boundingBox();
    check('dialogo e comandi entro viewport',modal&&footer&&modal.y>=-1&&modal.y+modal.height<=s.height+1&&footer.y>=0&&footer.y+footer.height<=s.height+1,{modal,footer});
    const commands=await frame.locator('[data-crop-footer] > button').all();
    check('quattro aree touch entro la finestra',commands.length===4&&(await Promise.all(commands.map(b=>b.boundingBox()))).every(b=>b&&b.width>=44&&b.height>=44&&b.x>=-1&&b.x+b.width<=s.width+1&&b.y>=-1&&b.y+b.height<=s.height+1));
    await page.screenshot({path:`${out}/${engine}-${s.name}-crop.png`});
    await frame.getByRole('button',{name:'Ruota la foto di 90 gradi a destra'}).tap({timeout:7000});
    await frame.waitForFunction(()=>{const i=document.querySelector('[role=dialog] img');return i?.naturalWidth===1200&&i?.naturalHeight===900});
    await frame.getByRole('button',{name:'Ruota la foto di 90 gradi a sinistra'}).tap({timeout:7000});
    await frame.waitForFunction(()=>{const i=document.querySelector('[role=dialog] img');return i?.naturalWidth===900&&i?.naturalHeight===1200});
    check('rotazioni touch funzionanti',true);
    await frame.getByRole('button',{name:'Ritaglia',exact:true}).tap({timeout:7000});await dialog.waitFor({state:'detached'});
    await frame.waitForFunction(()=>document.querySelector('textarea')?.value==='Puella rosam videt.');
    check('conferma ritaglio e OCR simulato',uploads===1,{uploads});
    const after=await frame.evaluate(()=>({hasResult:document.documentElement.classList.contains('lf-has-colored-result'),flag:document.documentElement.hasAttribute('data-lf-crop-open'),overflow:getComputedStyle(document.documentElement).overflowY,body:getComputedStyle(document.body).position}));
    check('chiusura ripristina il lock e preserva il risultato',after.hasResult&&!after.flag&&after.body!=='fixed'&&(s.embed?after.overflow==='scroll':after.overflow!=='hidden'),after);
    check('nessun errore JavaScript',errors.length===0,errors);
    record.ok=true;
   }catch(error){record.error=String(error);await page.screenshot({path:`${out}/${engine}-${s.name}-FAILED.png`}).catch(()=>{});}
   results.push(record);console.log(engine,s.name,record.ok?'OK':'FAIL',record.checks.length,'controlli',record.error??'');await context.close();
  }
 }finally{await browser.close();}
}
await fs.writeFile(`${out}/results.json`,JSON.stringify(results,null,2));
console.log(`SCENARI ${results.filter(r=>r.ok).length}/${results.length}; controlli ${results.flatMap(r=>r.checks).filter(c=>c.ok).length}/${results.flatMap(r=>r.checks).length}`);
if(results.some(r=>!r.ok))process.exitCode=1;

