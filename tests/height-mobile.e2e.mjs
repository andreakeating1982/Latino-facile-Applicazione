import { chromium, webkit } from 'playwright';
import fs from 'node:fs/promises';
import superjson from 'superjson';

// Con la cornice v4 reale, server locale e risposte IA sintetiche: nessun dato utente.
const base = process.env.HEIGHT_TEST_URL || 'http://127.0.0.1:3000';
const output = process.env.HEIGHT_TEST_OUTPUT || '/tmp/latino-height-mobile';
const engines = (process.env.HEIGHT_TEST_ENGINES || 'chromium,webkit').split(',');
const frameSource = await fs.readFile('cornice-dinamica/embed-latino-facile-blog-v4.html', 'utf8');
const productionUrl = "var APP_URL = 'https://latino-facile-app-2.easy-peasy.site/';";
if (!frameSource.includes(productionUrl)) throw new Error('URL cornice non trovato: prova interrotta per evitare di testare la produzione.');
const html = frameSource.replace(productionUrl, `var APP_URL = '${base}/';`);
await fs.mkdir(output, { recursive: true });
const words=['Puella','rosam','videt'];
const sentences=[{tokens:words.map(word=>({text:word,word,trailing:'',isPunct:false,analysis:{word,display:word,options:[{lemma:word,form:word,summary:'',translation:'',freq:1,raw:'',desc:'nome',pos:'nome',case:'nominativo',number:'singolare'}],selected:0,category:'nome',color:'#FFC742',label:'nome',source:'manuale',number:'singolare'}}))}];
const records=[];
for (const engine of engines) {
  const browser=await {chromium,webkit}[engine].launch({headless:true,...(engine==='chromium'?{args:['--no-sandbox','--disable-features=LocalNetworkAccessChecks']}:{})});
  try {
    for (const scenario of [{name:'320',width:320,height:700,scale:1},{name:'390',width:390,height:844,scale:1},{name:'390-large',width:390,height:844,scale:1.6},{name:'desktop',width:1440,height:900,scale:1}]) {
      const context=await browser.newContext({viewport:{width:scenario.width,height:scenario.height},isMobile:scenario.width<500,hasTouch:scenario.width<500});
      const page=await context.newPage(); const errs=[];page.on('pageerror',e=>errs.push(e.message));
      await context.addInitScript((scale)=>{try{localStorage.setItem('lf_access',JSON.stringify({fontScale:scale,lineHeight:1.5,ruler:false,mode:'normale'}));}catch{}},scenario.scale);
      await page.route('**/api/trpc/**',route=>{const u=new URL(route.request().url());const paths=u.pathname.split('/api/trpc/')[1].split(','); const data=paths.map(p=>({result:{data:superjson.serialize(p==='latino.analyze'?{sentences,unknownWords:[],apiUsed:false,colorSource:'regole'}:p==='latino.translate'?{coloredSentences:sentences,lines:['La ragazza vede la rosa.'],source:'ai',colorSource:'ai'}:null)}}));return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(u.searchParams.get('batch')==='1'?data:data[0])});});
      await page.route('http://localhost:3000/__height_blog',route=>route.fulfill({contentType:'text/html',body:`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0"><div style="height:70px">Blog di prova</div>${html}<div style="height:300px">Fine</div></body></html>`}));
      const rec={engine,scenario:scenario.name,ok:false};
      try {
        await page.goto('http://localhost:3000/__height_blog');
        const frame=page.frameLocator('iframe.lf-iframe');
        await frame.getByLabel('Nome',{exact:true}).fill('Anna');await frame.getByLabel('Cognome',{exact:true}).fill('Rossi');
        await page.waitForTimeout(1500);
        await frame.getByRole('button',{name:"Entra nell'app Latino Facile"}).click();
        await frame.locator('textarea').waitFor();await page.waitForTimeout(1800);
        const measure=async()=>{
          const outside=await page.locator('iframe.lf-iframe').evaluate(el=>({iframe:el.getBoundingClientRect().height,width:el.getBoundingClientRect().width}));
          const inside=await frame.locator('main').evaluate(el=>{const d=document;const root=d.querySelector('#root');const section=el.querySelector('section');const toolbar=d.querySelector('[role=toolbar]');const r=x=>x?({top:Math.round(x.getBoundingClientRect().top),bottom:Math.round(x.getBoundingClientRect().bottom),height:Math.round(x.getBoundingClientRect().height)}):null;return {main:r(el),section:r(section),toolbar:r(toolbar),root:r(root),bodyOffset:d.body.offsetHeight,bodyScroll:d.body.scrollHeight,docScroll:d.documentElement.scrollHeight,viewport:innerHeight,horizontalOverflow:d.documentElement.scrollWidth-innerWidth};});
          return {...outside,...inside};
        };
        rec.initial=await measure();
        rec.series=[];for(let i=0;i<7;i++){await page.waitForTimeout(500);rec.series.push((await measure()).iframe)}
        await page.screenshot({path:`${output}/${engine}-${scenario.name}-initial.png`,fullPage:true});
        await frame.locator('textarea').fill('Puella rosam videt.');
        await frame.getByRole('button',{name:/Colora la frase con l.intelligenza artificiale/i}).click();
        await frame.locator('.chip-word').first().waitFor();await page.waitForTimeout(2400);
        rec.result=await measure();rec.resultSeries=[];for(let i=0;i<6;i++){await page.waitForTimeout(500);rec.resultSeries.push((await measure()).iframe)}
        await page.screenshot({path:`${output}/${engine}-${scenario.name}-result.png`,fullPage:true});
        rec.errors=errs;
        // L'iframe deve racchiudere il contenuto ma senza spazio vuoto superfluo.
        // La cornice reale impone un minimo di 400 px; gli 8 px residui sono
        // dovuti all'arrotondamento e alla tolleranza anti-tremolio.
        const fits=(m)=>m.iframe>=m.root.bottom-16 && m.iframe<=Math.max(400,m.root.bottom)+24;
        rec.ok=rec.initial.horizontalOverflow<=1 && rec.result.horizontalOverflow<=1 && Math.max(...rec.series)-Math.min(...rec.series)<=16 && Math.max(...rec.resultSeries)-Math.min(...rec.resultSeries)<=16 && fits(rec.initial) && fits(rec.result) && !errs.length;
      }catch(e){rec.error=String(e);await page.screenshot({path:`${output}/${engine}-${scenario.name}-FAIL.png`,fullPage:true}).catch(()=>{});}
      records.push(rec);console.log(JSON.stringify(rec));await context.close();
    }
  } finally {await browser.close();}
}
await fs.writeFile(`${output}/results.json`,JSON.stringify(records,null,2));
if(records.some(r=>!r.ok))process.exitCode=1;

