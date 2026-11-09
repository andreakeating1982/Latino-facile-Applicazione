import { chromium, type Page } from 'playwright';
import fs from 'node:fs/promises';
import superjson from 'superjson';
import { optionColor } from '../server/analyzer/index';
import { type AnalysisOption, type TokenData } from '../shared/types';

// UI locale: richieste analisi e traduzione simulate, nessun dato studente reale.
const BASE = process.env.COLOR_QA_BASE_URL ?? 'http://127.0.0.1:3000';
const OUT = process.env.LEGEND_VISIBILITY_QA_OUTPUT ?? '/tmp/latino-legenda-qa';
await fs.mkdir(OUT, { recursive: true });
const samples: [string, Partial<AnalysisOption>][] = [
  ['Puella', {pos:'nome', case:'nominativo', number:'singolare'}],
  ['puellam', {pos:'nome', case:'accusativo', number:'singolare'}],
  ['amat', {pos:'verbo', mood:'indicativo'}],
  ['Nunc', {pos:'avverbio'}],
  ['in', {pos:'preposizione'}],
  ['et', {pos:'congiunzione'}],
];
const tokens: TokenData[] = samples.map(([word, attrs]) => {
  const opt = { lemma:word.toLowerCase(), summary:'', translation:'', form:word.toLowerCase(), freq:1, desc:attrs.mood??attrs.case??'', raw:'', ...attrs } as AnalysisOption;
  return {text:word,word:word.toLowerCase(),trailing:'',isPunct:false,analysis:{word:word.toLowerCase(),display:word,options:[opt],selected:0,category:opt.pos,color:optionColor(opt),label:opt.desc,source:'manuale',number:opt.number}};
});
const sentences = [{tokens}];
const checks: {name:string,ok:boolean,detail?:unknown}[] = [];
function check(name:string, ok:boolean, detail?:unknown) {checks.push({name,ok,detail}); if(!ok) throw new Error(`${name}: ${JSON.stringify(detail)}`);}
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const errors:string[]=[];
let hold: Promise<void> = Promise.resolve();
let release:()=>void = ()=>{};
let failNext=false;
let emptyNext=false;
const waitForResponse = () => { hold=new Promise<void>(r=>{release=r;}); };
async function snapshotLegend(page:Page){
  return page.locator('.card-paper').filter({hasText:'I colori delle frasi'}).evaluate(el => {
    const props=['color','backgroundColor','borderTopColor','borderRightColor','borderBottomColor','borderLeftColor','textDecorationColor','outlineColor'] as const;
    return [el,...el.querySelectorAll('*')].map(node=>{
      const style=getComputedStyle(node); return {tag:node.tagName, ownText:Array.from(node.childNodes).filter(x=>x.nodeType===Node.TEXT_NODE).map(x=>x.textContent?.trim()).join(''), color:Object.fromEntries(props.map(p=>[p,style[p]]))};
    });
  });
}
function noOverflow(page:Page){return page.evaluate(()=>{
  const items=Array.from(document.querySelectorAll('[role=listitem]'));
  const leaves=items.flatMap((item,i)=>Array.from(item.querySelectorAll('div')).filter(el=>!!el.textContent?.trim()&&el.children.length===0).map(el=>({el,i,r:el.getBoundingClientRect()})));
  const errors:string[]=[];
  for(const {el,r} of leaves){const lh=parseFloat(getComputedStyle(el).lineHeight)||parseFloat(getComputedStyle(el).fontSize);if(el.scrollWidth>el.clientWidth+1||r.height>lh*1.8)errors.push('a capo o sfora: '+el.textContent?.trim());}
  for(let i=0;i<leaves.length;i++)for(let j=i+1;j<leaves.length;j++){const a=leaves[i],b=leaves[j];if(Math.min(a.r.bottom,b.r.bottom)-Math.max(a.r.top,b.r.top)>2&&Math.min(a.r.right,b.r.right)-Math.max(a.r.left,b.r.left)>2)errors.push(`sovrapposizione: ${a.el.textContent?.trim()} / ${b.el.textContent?.trim()}`);}
  const alignment = items.flatMap((item)=>{
    const dots=Array.from(item.querySelectorAll('.legend-dot'));
    if(dots.length!==2) return [];
    const labels=Array.from(item.querySelectorAll('div.whitespace-nowrap')).slice(0,2);
    return dots.map((dot,i)=>{const d=dot.getBoundingClientRect(),t=labels[i]?.getBoundingClientRect();return {text:labels[i]?.textContent?.trim(),delta:t?Math.abs((d.top+d.bottom-t.top-t.bottom)/2):Infinity};});
  });
  for(const {text,delta} of alignment) if(delta>2.5) errors.push('campione disallineato: '+text+' ('+delta.toFixed(1)+'px)');
  const viewport=document.documentElement.clientWidth, scrollWidth=document.documentElement.scrollWidth;
  return {page:scrollWidth<=viewport+1,viewport,scrollWidth,errors};
});}
async function mock(page:Page){
  await page.route('**/api/trpc/**',async route=>{
    const url=new URL(route.request().url()); const paths=url.pathname.split('/api/trpc/')[1].split(',');
    if(paths.includes('latino.analyze')) {await hold; if(failNext){failNext=false; await route.abort('failed');return;}}
    const body=paths.map(path=>{let data:unknown=null; if(path==='latino.analyze') {data={sentences:emptyNext?[]:sentences,unknownWords:[],apiUsed:false,colorSource:'regole'}; emptyNext=false;} if(path==='latino.translate') data={coloredSentences:sentences,lines:['Frase di prova.'],source:'ai',colorSource:'ai'}; return {result:{data:superjson.serialize(data)}};});
    await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(url.searchParams.get('batch')==='1'?body:body[0])});
  });
}
try{
  const page=await browser.newPage({viewport:{width:1100,height:900}}); page.on('pageerror',e=>errors.push(e.message)); await mock(page);
  await page.goto(BASE+'/app');
  await page.locator('textarea').fill('Puella puellam amat.');
  const legend=page.locator('.card-paper').filter({hasText:'I colori delle frasi'});
  check('legenda assente alla prima apertura',await legend.count()===0);
  waitForResponse(); await page.getByRole('button',{name:/Colora la frase con l.intelligenza artificiale/i}).click();
  await page.getByText(/L.IA STA COLORANDO/).waitFor();
  check('legenda assente durante la prima analisi',await legend.count()===0);
  release(); await page.getByRole('button',{name:/Cambia colore o sottolineatura di puella/i}).first().waitFor(); await legend.waitFor();
  check('legenda visibile dopo la frase colorata',await legend.isVisible());
  const snapshot=await snapshotLegend(page);
  {
    // Riferimento acquisito sulla 8802 prima della modifica, non rigenerato nel test.
    const old=JSON.parse(await fs.readFile(new URL('./fixtures/legend-colors-8802.json',import.meta.url),'utf8'));
    check('tutti i colori del pannello legenda identici alla versione 8802',JSON.stringify(snapshot)===JSON.stringify(old),{nodi:snapshot.length});
    for(const width of [320,390,768,1100]){
      await page.setViewportSize({width,height:900}); await page.evaluate(()=>document.fonts.ready); const audit=await noOverflow(page);
      check(`nessuna scritta legenda a capo e nessuno overflow ${width}px`,audit.page&&audit.errors.length===0,audit);
      await page.screenshot({path:`${OUT}/risultato-${width}.png`,fullPage:true});
      // Il minimo in rem non deve far sforare la legenda quando il testo
      // viene ingrandito dalla barra di accessibilità, neppure a 320 px.
      for(let i=0;i<6;i++) await page.getByRole('button',{name:'Aumenta la dimensione del testo'}).click();
      await page.waitForTimeout(350);
      const size=await page.evaluate(()=>parseFloat(getComputedStyle(document.documentElement).fontSize));
      const scaled=await noOverflow(page);
      check(`legenda ${width}px al 160%: una riga, campioni allineati e niente overflow`,size>=25.5&&scaled.page&&scaled.errors.length===0,{size,...scaled});
      check(`legenda ${width}px al 160%: colori originali invariati`,JSON.stringify(await snapshotLegend(page))===JSON.stringify(old));
      await page.screenshot({path:`${OUT}/risultato-ingrandito-${width}.png`,fullPage:true});
      if(width===320||width===1100) await legend.screenshot({path:`${OUT}/legenda-ingrandita-${width}.png`});
      for(let i=0;i<6;i++) await page.getByRole('button',{name:'Riduci la dimensione del testo'}).click();
      await page.waitForTimeout(350);
    }
    await page.setViewportSize({width:1100,height:900});
    // Una successiva analisi resta bloccata finché il test non la sblocca.
    waitForResponse(); failNext=true;
    await page.locator('textarea').fill('Alia sententia.');
    await page.getByRole('button',{name:/Colora la frase con l.intelligenza artificiale/i}).click();
    await page.getByText(/L.IA STA COLORANDO/).waitFor();
    check('legenda nascosta durante una nuova analisi',await legend.count()===0);
    release(); await page.getByText(/Ops, qualcosa è andato storto/i).waitFor();
    check('risultato precedente e legenda recuperati dopo errore',await legend.isVisible() && await page.getByRole('button',{name:/Cambia colore o sottolineatura di puella/i}).first().isVisible());
    waitForResponse(); await page.getByRole('button',{name:/Colora la frase con l.intelligenza artificiale/i}).click();
    await page.getByText(/L.IA STA COLORANDO/).waitFor(); check('legenda nascosta durante retry',await legend.count()===0);
    release(); await legend.waitFor(); check('legenda riappare dopo retry riuscito',await legend.isVisible());
    waitForResponse(); emptyNext=true; await page.getByRole('button',{name:/Colora la frase con l.intelligenza artificiale/i}).click();
    await page.getByText(/L.IA STA COLORANDO/).waitFor(); release();
    await page.getByText(/L.IA STA COLORANDO/).waitFor({state:'hidden'});
    check('nessuna legenda se il risultato non contiene frasi colorate',await legend.count()===0);
    check('nessun errore JavaScript',errors.length===0,errors);

    const failedPage=await browser.newPage({viewport:{width:390,height:850},hasTouch:true,isMobile:true});
    await mock(failedPage); await failedPage.goto(BASE+'/app'); await failedPage.locator('textarea').fill('Puella amat.');
    waitForResponse(); failNext=true;
    await failedPage.getByRole('button',{name:/Colora la frase con l.intelligenza artificiale/i}).click();
    await failedPage.getByText(/L.IA STA COLORANDO/).waitFor(); release();
    await failedPage.getByText(/Ops, qualcosa è andato storto/i).waitFor();
    check('mobile: nessuna legenda dopo errore senza risultato precedente',await failedPage.locator('.card-paper').filter({hasText:'I colori delle frasi'}).count()===0);
    await failedPage.close();

    // Cornice stretta emulata: non leggere né modificare la pagina Blogger reale.
    const embedded=await browser.newPage({viewport:{width:390,height:900}});
    await mock(embedded);
    await embedded.route(BASE+'/__test_cornice',route=>route.fulfill({contentType:'text/html',body:`<!doctype html><title>Test cornice locale</title><iframe id="app" title="Latino Facile" src="${BASE}/app?cornice=test-latino" style="width:320px;height:100px;border:0"></iframe><script>window.altezze=[];window.addEventListener('message',e=>{const f=document.getElementById('app');if(e.source===f.contentWindow&&e.data?.type==='labvisivo:height'&&e.data.cornice==='test-latino'){window.altezze.push(e.data.height);f.style.height=e.data.height+'px';}})</script>`}));
    await embedded.goto(BASE+'/__test_cornice');
    const frame=embedded.frameLocator('#app');
    await frame.locator('textarea').waitFor();
    await embedded.waitForFunction('window.altezze.length > 0');
    await embedded.waitForTimeout(400);
    const before=await embedded.locator('#app').evaluate(el=>el.getBoundingClientRect().height);
    check('cornice mobile: legenda assente all’apertura',await frame.locator('.card-paper').filter({hasText:'I colori delle frasi'}).count()===0);
    await frame.locator('textarea').fill('Puella amat.'); waitForResponse();
    await frame.getByRole('button',{name:/Colora la frase con l.intelligenza artificiale/i}).click();
    await frame.getByText(/L.IA STA COLORANDO/).waitFor();
    check('cornice mobile: legenda assente durante analisi',await frame.locator('.card-paper').filter({hasText:'I colori delle frasi'}).count()===0);
    release();
    await frame.locator('.card-paper').filter({hasText:'I colori delle frasi'}).waitFor();
    await embedded.waitForFunction((oldHeight)=>document.querySelector('#app')!.getBoundingClientRect().height>oldHeight+200,before,{timeout:10000});
    const after=await embedded.locator('#app').evaluate(el=>el.getBoundingClientRect().height);
    check('cornice mobile: altezza aggiornata dopo il risultato',after>before+200,{before,after});
    const child=embedded.frames().find(f=>f.url().includes('/app?cornice=test-latino'))!;
    const frameAudit=await child.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,embedded:document.documentElement.classList.contains('lf-embedded')}));
    check('cornice mobile: niente overflow orizzontale',frameAudit.embedded&&frameAudit.scrollWidth<=frameAudit.width+1,frameAudit);
    for(let i=0;i<6;i++) await frame.getByRole('button',{name:'Aumenta la dimensione del testo'}).click();
    await embedded.waitForTimeout(400);
    const scaledFrame=await child.evaluate(()=>{
      const items=Array.from(document.querySelectorAll('[role=listitem]'));
      const leaves=items.flatMap(item=>Array.from(item.querySelectorAll('div')).filter(el=>!!el.textContent?.trim()&&el.children.length===0));
      const bad=leaves.filter(el=>el.scrollWidth>el.clientWidth+1).map(el=>el.textContent?.trim());
      return {embedded:document.documentElement.classList.contains('lf-embedded'),width:document.documentElement.clientWidth,scrollWidth:document.documentElement.scrollWidth,font:parseFloat(getComputedStyle(document.documentElement).fontSize),bad};
    });
    check('cornice 320px al 160%: legenda senza a capo o overflow',scaledFrame.embedded&&scaledFrame.font>=25.5&&scaledFrame.scrollWidth<=scaledFrame.width+1&&scaledFrame.bad.length===0,scaledFrame);
    await embedded.close();
  }
  await fs.writeFile(`${OUT}/results.json`,JSON.stringify(checks,null,2));
  console.log(JSON.stringify(checks,null,2));
} finally {await browser.close();}

