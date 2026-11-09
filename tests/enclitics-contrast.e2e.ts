import { chromium, webkit, type Page } from 'playwright';
import fs from 'node:fs/promises';
import superjson from 'superjson';
import { optionColor } from '../server/analyzer/index';
import { LEGEND_ITEMS, shadeForNumber, colorForEnclitic, type AnalysisOption, type TokenData } from '../shared/types';

// Interfaccia vera con risposte sintetiche: nessuna chiamata IA, studente o DB reale.
const base = process.env.ENCLITIC_QA_BASE_URL ?? 'http://127.0.0.1:3000';
const out = process.env.ENCLITIC_QA_OUTPUT ?? '/tmp/latino-enclitiche-qa';
await fs.mkdir(out, {recursive:true});
type Sample = {word:string; attrs:Partial<AnalysisOption>; suffix:string};
const samples: Sample[] = [
  {word:'puellaque',attrs:{pos:'nome',case:'nominativo',number:'singolare'},suffix:'que'},
  {word:'rosaeque',attrs:{pos:'nome',case:'genitivo',number:'singolare'},suffix:'que'},
  {word:'aquaeve',attrs:{pos:'nome',case:'dativo',number:'singolare'},suffix:'ve'},
  {word:'terramne',attrs:{pos:'nome',case:'accusativo',number:'singolare'},suffix:'ne'},
  {word:'domineque',attrs:{pos:'nome',case:'vocativo',number:'singolare'},suffix:'que'},
  {word:'mecum',attrs:{pos:'pronome',case:'ablativo',number:'singolare'},suffix:'cum'},
  {word:'agricolaeque',attrs:{pos:'nome',case:'nominativo',number:'plurale'},suffix:'que'},
  {word:'puellarumve',attrs:{pos:'nome',case:'genitivo',number:'plurale'},suffix:'ve'},
  {word:'puellisne',attrs:{pos:'nome',case:'dativo',number:'plurale'},suffix:'ne'},
  {word:'terrasque',attrs:{pos:'nome',case:'accusativo',number:'plurale'},suffix:'que'},
  {word:'amicique',attrs:{pos:'nome',case:'vocativo',number:'plurale'},suffix:'que'},
  {word:'nobiscum',attrs:{pos:'pronome',case:'ablativo',number:'plurale'},suffix:'cum'},
  {word:'amatne',attrs:{pos:'verbo',mood:'indicativo',voice:'passivo'},suffix:'ne'},
  {word:'videretque',attrs:{pos:'verbo',mood:'congiuntivo'},suffix:'que'},
  {word:'amareve',attrs:{pos:'verbo',mood:'infinito'},suffix:'ve'},
  {word:'nuncque',attrs:{pos:'avverbio'},suffix:'que'},
  {word:'inve',attrs:{pos:'preposizione'},suffix:'ve'},
  {word:'etque',attrs:{pos:'congiunzione'},suffix:'que'},
  {word:'ignotumque',attrs:{pos:'sconosciuto'},suffix:'que'},
  // Un caso volutamente molto lungo verifica lo scroll locale, non il latino.
  {word:'incomprehensibilibusque',attrs:{pos:'aggettivo',case:'ablativo',number:'plurale'},suffix:'que'},
];
const tokens:TokenData[] = samples.map(({word,attrs,suffix})=>{
  const o={lemma:word,form:word,summary:'',translation:'',freq:1,raw:'',desc:attrs.pos,...attrs} as AnalysisOption;
  return {text:word,word,trailing:'',isPunct:false,analysis:{word,display:word,options:[o],selected:0,category:o.pos,color:optionColor(o),label:o.desc,source:'manuale',number:o.number,voice:o.voice,suffisso:{testo:suffix,colore:colorForEnclitic(suffix)}}};
});
const sentences=[{tokens}];
const css = (hex:string) => `rgb(${[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)).join(', ')})`;
const palette=LEGEND_ITEMS.flatMap(item=>item.numero ? [
  {label:`${item.label[0]}${item.label.slice(1).toLowerCase()} singolare`,color:shadeForNumber(item.color,'singolare')},
  {label:`${item.label[0]}${item.label.slice(1).toLowerCase()} plurale`,color:shadeForNumber(item.color,'plurale')},
] : [{label:`${item.label[0]}${item.label.slice(1).toLowerCase()}`,color:item.color}]);
async function mockApi(page:Page) {
  await page.route('**/api/trpc/**', route=>{
    const url=new URL(route.request().url()),paths=url.pathname.split('/api/trpc/')[1].split(',');
    const data=paths.map(path=>({result:{data:superjson.serialize(path==='latino.analyze'?{sentences,unknownWords:[],apiUsed:false,colorSource:'regole'}:path==='latino.translate'?{coloredSentences:sentences,lines:['Frase di prova.'],source:'ai',colorSource:'ai'}:null)}}));
    return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(url.searchParams.get('batch')==='1'?data:data[0])});
  });
}
const engine=process.env.ENCLITIC_QA_ENGINE??'chromium';
if(!['chromium','webkit'].includes(engine))throw new Error(`Motore non supportato: ${engine}`);
const browser=await (engine==='webkit'?webkit:chromium).launch({headless:true,...(engine==='chromium'?{args:['--no-sandbox','--disable-features=LocalNetworkAccessChecks']}:{})});
const results: {name:string; ok:boolean; checks:{name:string;ok:boolean;detail?:unknown}[]; error?:string}[]=[];
const only=process.env.ENCLITIC_QA_CASES?.split(',');
try {
  for(const s of [
    {name:'mobile-280-font160',width:280,height:640,scale:1.6},
    {name:'mobile-320',width:320,height:720,scale:1},
    {name:'mobile-320-font160',width:320,height:720,scale:1.6},
    {name:'mobile-390-contrasto',width:390,height:844,scale:1.6,contrast:true},
    {name:'desktop',width:1280,height:900,scale:1},
    {name:'blog-280-font160',width:280,height:640,scale:1.6,embed:true},
    {name:'blog-320-font160',width:320,height:720,scale:1.6,embed:true},
  ].filter(s=>!only||only.includes(s.name))) {
    const context=await browser.newContext({viewport:{width:s.width,height:s.height},isMobile:s.width<500,hasTouch:s.width<500});
    const page=await context.newPage();
    const result:{name:string;ok:boolean;checks:{name:string;ok:boolean;detail?:unknown}[];error?:string}={name:s.name,ok:false,checks:[]};
    const check=(name:string,ok:boolean,detail?:unknown)=>{result.checks.push({name,ok,...(detail===undefined?{}:{detail})});if(!ok)throw new Error(`${name}: ${JSON.stringify(detail)}`);};
    const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
    // tsx preserva i nomi delle funzioni locali con un helper; quando il
    // callback viene serializzato nel browser Playwright, l'helper deve
    // esistere anche in quella pagina di prova (non nell'applicazione).
    await context.addInitScript('window.__name = (target) => target');
    await context.addInitScript(({scale,contrast})=>{try{localStorage.setItem('lf_access',JSON.stringify({fontScale:scale,lineHeight:1.65,ruler:false,mode:contrast?'contrasto':'normale'}));}catch{}},{scale:s.scale,contrast:!!s.contrast});
    await mockApi(page);
    try {
      if(s.embed) {
        await page.route('http://localhost:3000/__enclitiche-blog',r=>r.fulfill({contentType:'text/html',body:`<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><body style="margin:0"><header style="height:140px">Blog</header><iframe src="${base}/app?cornice=enclitiche" title="Latino Facile" style="width:calc(100% - 16px);margin:0 8px;height:1300px;border:0"></iframe><script>addEventListener('message',e=>{const f=document.querySelector('iframe');if(e.source===f.contentWindow&&e.data?.type==='labvisivo:height')f.style.height=Math.max(640,e.data.height)+'px'})</script></body>`}));
        await page.goto('http://localhost:3000/__enclitiche-blog');
      } else await page.goto(base+'/app?nome=QA&cognome=Test&classe=2A');
      const frame=s.embed?page.frames().find(f=>f.url().startsWith(base+'/app'))!:page.mainFrame();
      if(s.embed&&process.env.ENCLITIC_TEST_GUTTER)await frame.addStyleTag({content:process.env.ENCLITIC_TEST_GUTTER==='scroll'?'html.lf-embedded { overflow-y: scroll; }':'html.lf-embedded { scrollbar-gutter: stable; }'});
      await frame.locator('textarea').waitFor();await frame.evaluate(()=>document.fonts.ready);
      // In una cornice lunga è il blog a scorrere, non il contenuto interno:
      // centrare prima il controllo nel viewport del genitore, poi usare un
      // vero tap sui telefoni (il click mouse attiva :hover anche sul touch).
      // Il dialogo modifica temporaneamente l'altezza dell'iframe: aspettare
      // coordinate stabili, altrimenti un tocco colpisce il punto precedente.
      const waitFrameStable=async()=>{
        if(!s.embed)return;
        await page.evaluate(()=>{(window as any).__lfQaFrameStable=null;(window as any).__lfQaFrameHistory=[];});
        try {
          await page.waitForFunction(()=>{
            const iframe=document.querySelector('iframe');if(!iframe)return false;
            const r=iframe.getBoundingClientRect(),now=performance.now();
            const previous=(window as any).__lfQaFrameStable;
            if(!previous||Math.abs(previous.height-r.height)>.5||Math.abs(previous.top-r.top)>.5){
              (window as any).__lfQaFrameHistory.push({height:r.height,top:r.top,scrollY:window.scrollY,at:now});
              (window as any).__lfQaFrameStable={height:r.height,top:r.top,since:now};return false;
            }
            return now-previous.since>=650;
          },null,{polling:100,timeout:6000});
        } catch(error) {
          if(process.env.ENCLITIC_TOUCH_TRACE){
            console.log('FRAME-OSCILLAZIONE',JSON.stringify(await page.evaluate(()=>(window as any).__lfQaFrameHistory)));
            console.log('FRAME-INTERNO',JSON.stringify(await frame.evaluate(()=>new Promise(resolve=>{
              const all:any[]=[];const timer=setInterval(()=>{
                const root=document.documentElement,body=document.body,p=document.querySelector('.lf-sentence'),section=p?.closest('section');
                all.push({innerHeight,innerWidth,clientH:root.clientHeight,clientW:root.clientWidth,scrollH:root.scrollHeight,bodyH:body.scrollHeight,bodyOffset:body.offsetHeight,pClient:p?.clientWidth,pScroll:p?.scrollWidth,hint:!!document.getElementById('lf-sentence-scroll-help-0'),sectionH:section?.getBoundingClientRect().height});
                if(all.length===12){clearInterval(timer);resolve(all);}
              },150);
            }))));
          }
          throw error;
        }
      };
      const activate=async(control:ReturnType<typeof frame.locator>)=>{
        // Portare l'opzione dentro l'eventuale dialogo scorrevole PRIMA di
        // misurare la posizione nel blog. È solo una scrollata reale, non
        // una modifica al ColorDialog né un click forzato nel DOM.
        await control.evaluate(el=>el.scrollIntoView({block:'center',inline:'nearest',behavior:'instant'}));
        await page.waitForTimeout(s.embed?350:100);
        await waitFrameStable();
        if(s.embed){
          const r=await control.boundingBox();
          if(r)await page.evaluate(delta=>window.scrollBy({top:delta,behavior:'instant'}),r.y+r.height/2-s.height/2);
          await waitFrameStable();
        }
        if(s.width<500){
          // Tap hardware emulato sulla coordinata effettiva: il click via
          // locator di WebKit può giudicare instabile una cornice lunga anche
          // quando il pulsante è visibile. Le attese successive verificano che
          // il vero evento abbia aperto o chiuso il dialogo corretto.
          const r=await control.boundingBox();
          if(!r||r.x<0||r.y<0||r.x+r.width>s.width+1||r.y+r.height>s.height+1)
            throw new Error(`Comando fuori dal viewport: ${JSON.stringify(r)}`);
          if(process.env.ENCLITIC_TOUCH_TRACE){
            const hit=await control.evaluate(el=>{
              const r=el.getBoundingClientRect(), target=document.elementFromPoint((r.left+r.right)/2,(r.top+r.bottom)/2), dialog=el.closest('[role=dialog]');
              return {name:el.getAttribute('aria-label'),rect:{left:r.left,top:r.top,right:r.right,bottom:r.bottom},hit:target?.outerHTML?.slice(0,250),same:!!target&&(el===target||el.contains(target)),frameScroll:{x:window.scrollX,y:window.scrollY},dialogScroll:dialog?.scrollTop};
            });
            const parent=await page.evaluate(({x,y})=>({scrollX:window.scrollX,scrollY:window.scrollY,at:document.elementFromPoint(x,y)?.outerHTML?.slice(0,200)}),{x:r.x+r.width/2,y:r.y+r.height/2});
            console.log('TOUCH-TRACE',JSON.stringify({outer:r,inner:hit,parent}));
          }
          await page.touchscreen.tap(r.x+r.width/2,r.y+r.height/2);
          await page.waitForTimeout(250); // React applica lo stato del colore
        } else await control.click({timeout:12000});
      };
      await frame.locator('textarea').fill(samples.map(v=>v.word).join(' '));
      await activate(frame.getByRole('button',{name:/Colora la frase con l.intelligenza artificiale/i}));
      const chip=(word:string)=>frame.getByRole('button',{name:new RegExp(`^Cambia colore o sottolineatura di ${word}(?:,|$)`)});
      const pick=async(label:string)=>{
        const option=frame.getByRole('button',{name:`Colore ${label}`,exact:true});
        await option.waitFor({state:'visible'});
        await activate(option);
      };
      await chip('rosaeque').waitFor();
      // Il primo ridimensionamento della cornice arriva entro 1,5 secondi;
      // attendere che sia stabile prima di misurare o toccare i chip.
      await page.waitForTimeout(s.embed?1800:800);
      if(s.embed){
        await waitFrameStable();
        check('cornice stabile dopo la colorazione',true);
      }
      if(process.env.ENCLITIC_TRACE && s.embed) {
        console.log('METRICHE-LARGHEZZA',JSON.stringify(await chip('agricolaeque').evaluate(el=>{
          const ancestors=[];let parent=el.parentElement;
          while(parent&&ancestors.length<9){const r=parent.getBoundingClientRect();const st=getComputedStyle(parent);ancestors.push({tag:parent.tagName,className:parent.className,left:r.left,right:r.right,width:r.width,clientWidth:parent.clientWidth,scrollWidth:parent.scrollWidth,overflowX:st.overflowX,padding:st.padding});parent=parent.parentElement;}
          const r=el.getBoundingClientRect();return {viewport:innerWidth,chip:{left:r.left,right:r.right,width:r.width},document:{client:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth},ancestors};
        })));
      }
      const state=async(word:string)=>chip(word).evaluate(el=>{
        const suffix=el.querySelector('.chip-enclitic') as HTMLElement | null;
        if(!suffix)return {found:false,word:el.textContent};
        const a=getComputedStyle(el), b=getComputedStyle(suffix);
        const rect=el.getBoundingClientRect(), sr=suffix.getBoundingClientRect();
        const rgb=(s:string)=>{const match=s.match(/[\d.]+/g);return match?.slice(0,3).map(Number)??[]};
        const lum=(s:string)=>rgb(s).map(x=>x/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4).reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i],0);
        const v=[lum(b.color),lum(b.backgroundColor)].sort((x,y)=>y-x);
        const range=document.createRange();range.selectNodeContents(el);
        return {found:true,word:el.textContent,baseColor:a.color,chipColor:a.backgroundColor,suffixColor:b.color,suffixBg:b.backgroundColor,borderColor:b.borderTopColor,suffix:suffix.textContent,contrast:(v[0]+.05)/(v[1]+.05),bounds:{left:rect.left,right:rect.right,top:rect.top,bottom:rect.bottom},suffixBounds:{left:sr.left,right:sr.right,top:sr.top,bottom:sr.bottom},suffixLines:suffix.getClientRects().length,underline:b.textDecorationLine,html:el.innerHTML};
      });
      for(const sample of samples){
        const actual=await state(sample.word);
        check(`${sample.word}: suffisso rilevato e parola unita`,actual.found&&actual.word===sample.word&&actual.suffix===sample.suffix,actual);
        check(`${sample.word}: contrasto >= 4,5`,actual.contrast>=4.5,actual);
        check(`${sample.word}: testo bianco/nero e contorno del colore base`,[css('#FFFFFF'),css('#1A1A1A')].includes(actual.suffixColor!)&&actual.borderColor===actual.chipColor,actual);
        check(`${sample.word}: suffisso intero nel chip`,actual.suffixLines===1&&actual.suffixBounds!.left>=actual.bounds!.left-1&&actual.suffixBounds!.right<=actual.bounds!.right+1&&actual.suffixBounds!.top>=actual.bounds!.top-1&&actual.suffixBounds!.bottom<=actual.bounds!.bottom+1,actual);
        const token=tokens.find(t=>t.word===sample.word)!;
        const expected=token.analysis!.number && ['nome','aggettivo','pronome','numerale'].includes(token.analysis!.category) ? shadeForNumber(token.analysis!.color,token.analysis!.number) : token.analysis!.color;
        check(`${sample.word}: colore della base invariato`,actual.chipColor===css(expected),{actual,expected});
      }
      const passive=await state('amatne');
      check('suffisso sottolineato se il verbo è passivo',passive.underline?.includes('underline')===true,passive);
      // Una parola con enclitica viene ricolorata su ogni opzione della palette.
      // Su mobile al 160% si verificano tre colori rappresentativi per limitare il tempo.
      // Sotto 300px controlliamo qui il rendering e lo scroll delle parole;
      // il ColorDialog ha un proprio test separato e non viene modificato.
      const picks=s.width<300?[]:s.name==='mobile-320'||s.name==='desktop'?palette:palette.filter(p=>['Genitivo singolare','Preposizioni','Congiunzioni'].includes(p.label));
      for(const pickItem of picks){
        await activate(chip('rosaeque'));
        await pick(pickItem.label);
        const actual=await state('rosaeque');
        check(`manuale ${pickItem.label}: chip esatto, contorno e contrasto`,actual.chipColor===css(pickItem.color)&&actual.borderColor===actual.chipColor&&actual.contrast>=4.5,actual);
      }
      // Sconosciuta nera e successivamente ricolorata: suffisso sempre leggibile.
      const unknown=await state('ignotumque');
      check('sconosciuta: chip nero e base bianca conservati',unknown.chipColor===css('#000000')&&unknown.baseColor===css('#FFFFFF'),unknown);
      if(s.width>=300){
        await activate(chip('ignotumque'));await pick('Preposizioni');
        const unknownManual=await state('ignotumque');
        check('sconosciuta ricolorata: contrasto e bordo',unknownManual.chipColor===css('#BDBDBD')&&unknownManual.borderColor===unknownManual.chipColor&&unknownManual.contrast>=4.5,unknownManual);
      }

      // Una parola lunghissima deve rimanere sulla stessa riga senza far
      // scorrere la pagina intera. Quando serve, la frase ha un proprio
      // scorrimento visibile, raggiungibile anche da tastiera.
      const dimensions=await frame.evaluate(()=>({client:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth}));
      if(process.env.ENCLITIC_TRACE && dimensions.scroll>dimensions.client+1){
        console.log('ELEMENTI-FUORI-VIEWPORT',JSON.stringify(await frame.evaluate(()=>[...document.querySelectorAll('*')].map(el=>{const r=el.getBoundingClientRect(),style=getComputedStyle(el);return {tag:el.tagName,cls:el.className,left:Math.round(r.left),right:Math.round(r.right),width:Math.round(r.width),overflow:style.overflowX,text:el.textContent?.trim().slice(0,45)};}).filter(x=>x.right>document.documentElement.clientWidth+1&&x.width>0).slice(0,35))));
      }
      check('pagina senza fuoriuscita orizzontale',dimensions.scroll<=dimensions.client+1,dimensions);
      const sentence=frame.locator('.lf-sentence').first();
      const sentenceInfo=await sentence.evaluate(el=>({client:el.clientWidth,scroll:el.scrollWidth,role:el.getAttribute('role'),focus:el.getAttribute('tabindex'),description:el.getAttribute('aria-describedby')}));
      if(sentenceInfo.scroll>sentenceInfo.client+1){
        check('frase lunga: regione accessibile e indicazione visibile',sentenceInfo.role==='region'&&sentenceInfo.focus==='0'&&!!sentenceInfo.description&&await frame.locator(`#${sentenceInfo.description}`).isVisible(),sentenceInfo);
        await sentence.evaluate(el=>{el.scrollLeft=0;});
        if(s.embed){
          const r=await sentence.boundingBox();
          if(r)await page.evaluate(delta=>window.scrollBy({top:delta,behavior:'instant'}),r.y+r.height/2-s.height/2);
        }
        await sentence.focus();await page.keyboard.press('ArrowRight');await page.waitForTimeout(300);
        const keyboardOffset=await sentence.evaluate(el=>el.scrollLeft);
        check('frase lunga: scorrimento da tastiera',keyboardOffset>0,{keyboardOffset});
        await sentence.evaluate(el=>{el.scrollLeft=el.scrollWidth;});
        const visible=await sentence.evaluate(el=>{
          const rect=el.getBoundingClientRect(),suffix=el.querySelector('[aria-label^="Cambia colore o sottolineatura di incomprehensibilibusque"] .chip-enclitic')!.getBoundingClientRect();
          return {scrollLeft:el.scrollLeft,area:{left:rect.left,right:rect.right},suffix:{left:suffix.left,right:suffix.right}};
        });
        check('frase lunga: suffisso raggiungibile per intero',visible.scrollLeft>0&&visible.suffix.left>=visible.area.left-1&&visible.suffix.right<=visible.area.right+1,visible);
        await sentence.evaluate(el=>{el.scrollLeft=0;});
      } else check('frase interamente contenuta senza scroll',sentenceInfo.scroll<=sentenceInfo.client+1,sentenceInfo);
      if(s.name==='blog-320-font160'){
        const shortWord=await state('agricolaeque');
        const area=await sentence.evaluate(el=>{const r=el.getBoundingClientRect();return {left:r.left,right:r.right};});
        check('parola lunga comune visibile per intero a 320px e 160%',shortWord.bounds!.left>=area.left-1&&shortWord.bounds!.right<=area.right+1,{area,shortWord});
      }
      await chip('rosaeque').scrollIntoViewIfNeeded();
      await page.mouse.move(0,0);await page.waitForTimeout(200);
      await page.screenshot({path:`${out}/${s.name}.png`});
      const text=await frame.locator('body').innerText();
      check('legenda ancora presente e completa',text.includes('I COLORI DELLE FRASI')&&text.includes('PREPOSIZIONI')&&text.includes('CONGIUNZIONI'));
      check('nessun errore JavaScript',errors.length===0,errors);
      result.ok=true;
    } catch(e){result.error=String(e);await page.screenshot({path:`${out}/${s.name}-FAILED.png`}).catch(()=>{});}
    results.push(result);console.log(result.name,result.ok?'OK':'FAIL',result.checks.length,'controlli',result.error??'');
    await context.close();
  }
} finally {await browser.close();}
await fs.writeFile(out+'/results.json',JSON.stringify(results,null,2));
console.log(`${engine}: SCENARI ${results.filter(r=>r.ok).length}/${results.length}; controlli ${results.flatMap(r=>r.checks).filter(c=>c.ok).length}/${results.flatMap(r=>r.checks).length}`);
if(results.some(r=>!r.ok))process.exitCode=1;

