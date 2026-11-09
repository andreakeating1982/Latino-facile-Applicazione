import { chromium, webkit } from 'playwright';
import fs from 'node:fs/promises';

// Solo foto sintetica e risposta OCR simulata. Un blog locale cross-origin
// riproduce la situazione di un iframe molto più alto del telefono.
const base = process.env.CROP_CONTROLS_BASE_URL ?? 'http://127.0.0.1:3000';
const out = process.env.CROP_CONTROLS_OUTPUT ?? '/tmp/latino-crop-controls';
const engines = (process.env.CROP_CONTROLS_ENGINES ?? 'chromium').split(',');
const app = `${base}/app?nome=QA&cognome=Test&classe=2A`;
const photo = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="900" height="1200"><rect width="900" height="1200" fill="#fffdf6"/><text x="60" y="120" font-size="46" fill="#222">Puella rosam videt.</text></svg>');
await fs.mkdir(out, { recursive: true });

const scenarios = [
  {name:'telefono-280-font160', width:280, height:568, scale:1.6},
  {name:'telefono-320', width:320, height:568, scale:1},
  {name:'telefono-320-font160', width:320, height:568, scale:1.6},
  {name:'telefono-320-fallback-font160', width:320, height:568, scale:1.6, legacy:true},
  {name:'telefono-360', width:360, height:640, scale:1},
  {name:'telefono-360-font160', width:360, height:640, scale:1.6},
  {name:'iphone-375', width:375, height:667, scale:1},
  {name:'iphone-375-font160', width:375, height:667, scale:1.6},
  {name:'telefono-393', width:393, height:852, scale:1},
  {name:'telefono-412', width:412, height:915, scale:1},
  {name:'orizzontale-568', width:568, height:320, scale:1},
  {name:'orizzontale-568-font160', width:568, height:320, scale:1.6},
  {name:'orizzontale-740-font160', width:740, height:360, scale:1.6},
  {name:'blog-280-font160', width:280, height:568, scale:1.6, embed:true},
  {name:'blog-280-fallback-font160', width:280, height:568, scale:1.6, embed:true, legacy:true},
  {name:'blog-320', width:320, height:568, scale:1, embed:true},
  {name:'blog-320-font160', width:320, height:568, scale:1.6, embed:true},
  {name:'blog-390-font160-contrasto', width:390, height:844, scale:1.6, embed:true, contrast:true},
  {name:'desktop', width:1280, height:800, scale:1, desktop:true},
];
const only = process.env.CROP_CONTROLS_CASES?.split(',');
const results = [];
for (const engine of engines) {
  const browserType = {chromium, webkit}[engine];
  if (!browserType) throw new Error(`Motore non supportato: ${engine}`);
  const browser = await browserType.launch({headless:true, ...(engine==='chromium' ? {args:['--no-sandbox','--disable-features=LocalNetworkAccessChecks']} : {})});
  try {
    for (const s of scenarios.filter(v => !only || only.includes(v.name))) {
      const context = await browser.newContext({viewport:{width:s.width,height:s.height},isMobile:!s.desktop,hasTouch:!s.desktop,deviceScaleFactor:1});
      const page = await context.newPage();
      const record = {engine, scenario:s.name, width:s.width, height:s.height, scale:s.scale, embed:!!s.embed, checks:[], ok:false};
      const check = (name, ok, detail) => record.checks.push({name, ok:!!ok, ...(detail===undefined ? {} : {detail})});
      let uploads=0;
      const errors=[];
      page.on('pageerror', error => errors.push(error.message));
      await context.addInitScript(({scale, contrast}) => {
        try { localStorage.setItem('lf_access', JSON.stringify({fontScale:scale,lineHeight:1.65,ruler:false,mode:contrast?'contrasto':'normale'})); } catch {}
      }, {scale:s.scale, contrast:!!s.contrast});
      await page.route('**/api/ai/transcribe', route => {uploads++;return route.fulfill({status:200,contentType:'application/json',body:'{"text":"Puella rosam videt."}'});});
      try {
        if (s.embed) {
          await page.route('http://localhost:3000/__crop-controls-blog', route => route.fulfill({contentType:'text/html',body:`<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><style>body{margin:0} header{height:240px} iframe{display:block;border:0;width:calc(100% - 16px);margin:0 8px;height:1600px}</style><header>Blog di prova</header><iframe title="Latino Facile" src="${app}&cornice=crop-controls"></iframe><footer style="height:1100px">Fine</footer><script>addEventListener('message',e=>{let f=document.querySelector('iframe');if(e.source===f.contentWindow&&e.data?.type==='labvisivo:height')f.style.height=Math.max(640,e.data.height)+'px'})</script>`}));
          await page.goto('http://localhost:3000/__crop-controls-blog');
        } else await page.goto(app);
        const frame = s.embed ? page.frames().find(f => f.url().startsWith(base+'/app')) : page.mainFrame();
        if (!frame) throw new Error('Iframe di prova non trovato');
        await frame.locator('input[type=file]').first().waitFor({state:'attached'});
        await frame.locator('textarea').waitFor();
        await frame.evaluate(() => document.fonts.ready);
        if (s.legacy) {
          // Applica entrambi i ripieghi `@supports not`: SCATTA/CARICA e
          // footer del crop sono in due blocchi separati. Riconoscerli dal
          // selettore, non dalla posizione nel foglio, evita di attivare solo
          // il primo ripiego dopo futuri riordini del CSS. Un motore moderno
          // non diventa un vecchio Safari: si simulano le sue regole CSS.
          await frame.evaluate(() => {
            const rules=[...document.styleSheets].flatMap(sheet=>{try{return [...sheet.cssRules]}catch{return []}});
            const fallbacks=rules.filter(rule=>rule instanceof CSSSupportsRule&&rule.conditionText.includes('container-type'));
            for(const selector of ['.lf-photo-actions','.lf-crop-footer']){
              if(!fallbacks.some(rule=>[...rule.cssRules].some(child=>child.cssText.includes(selector))))
                throw new Error(`Regole fallback CSS non trovate: ${selector}`);
            }
            const style=document.createElement('style');
            style.textContent='.lf-crop-footer,.lf-photo-actions {container-type:normal!important;}\n'+fallbacks.flatMap(rule=>[...rule.cssRules].map(child=>child.cssText)).join('\n');
            document.head.appendChild(style);
          });
        }
        // Anche SCATTA/CARICA, i comandi che avviano il flusso foto, non
        // devono debordare quando il testo è ingrandito in una cornice.
        const sourceButtons=await frame.locator('.lf-photo-actions').evaluate(group=>{
          const box=r=>({left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height});
          const outer=group.getBoundingClientRect();
          const buttons=[...group.querySelectorAll(':scope > button')].map(el=>{
            const r=el.getBoundingClientRect(),style=getComputedStyle(el),texts=[],words=[];
            for(const node of el.childNodes)if(node.nodeType===Node.TEXT_NODE&&node.textContent.trim()){
              const range=document.createRange();range.selectNodeContents(node);
              for(const rect of range.getClientRects())texts.push(box(rect));
              for(const m of node.textContent.matchAll(/\S+/g)){const one=document.createRange();one.setStart(node,m.index);one.setEnd(node,m.index+m[0].length);words.push({word:m[0],lines:one.getClientRects().length});}
            }
            const icon=el.querySelector('svg')?.getBoundingClientRect();
            return {name:el.textContent.trim(),rect:box(r),texts,words,icon:icon?box(icon):null,scrollWidth:el.scrollWidth,clientWidth:el.clientWidth,scrollHeight:el.scrollHeight,clientHeight:el.clientHeight,background:style.backgroundColor,color:style.color};
          });
          return {outer:box(outer),viewport:document.documentElement.clientWidth,buttons};
        });
        check('comandi SCATTA/CARICA entro la cornice',sourceButtons.buttons.length===2&&sourceButtons.buttons.every(b=>b.rect.left>=sourceButtons.outer.left-1&&b.rect.right<=sourceButtons.outer.right+1&&b.rect.left>=-1&&b.rect.right<=sourceButtons.viewport+1&&b.scrollWidth<=b.clientWidth+1&&b.scrollHeight<=b.clientHeight+1),sourceButtons);
        check('SCATTA/CARICA: testi e icone completi',sourceButtons.buttons.every(b=>b.words.every(w=>w.lines===1)&&b.texts.every(t=>t.left>=b.rect.left-1&&t.right<=b.rect.right+1&&t.top>=b.rect.top-1&&t.bottom<=b.rect.bottom+1)&&(!b.icon||(b.icon.left>=b.rect.left-1&&b.icon.right<=b.rect.right+1&&b.icon.top>=b.rect.top-1&&b.icon.bottom<=b.rect.bottom+1))),sourceButtons.buttons);
        check('SCATTA/CARICA: area touch minima 44px',sourceButtons.buttons.every(b=>b.rect.width>=44&&b.rect.height>=44),sourceButtons.buttons.map(({name,rect})=>({name,rect})));
        if(s.name==='blog-280-font160'||s.name==='telefono-320-font160'){
          const group=frame.locator('.lf-photo-actions');
          await group.scrollIntoViewIfNeeded();
          if(s.embed){const r=await group.boundingBox();if(r)await page.evaluate(delta=>window.scrollBy({top:delta,behavior:'instant'}),r.y+r.height/2-s.height/2);}
          await page.waitForTimeout(250);
          await page.screenshot({path:`${out}/${engine}-${s.name}-apertura-foto.png`});
        }
        if (s.embed) await page.evaluate(() => window.scrollTo(0,290));
        await frame.locator('input[type=file]').first().setInputFiles({name:'foto-sintetica.svg',mimeType:'image/svg+xml',buffer:photo});
        const dialog = frame.locator('[role=dialog]');
        await dialog.waitFor({state:'visible'});
        await frame.waitForFunction(() => document.querySelector('[role=dialog] img')?.naturalWidth > 0);
        // Attendere l'animazione di apertura anche con il carico del motore
        // WebKit: durante zoom-in-95 un target da 44px misura 41,8px.
        await frame.waitForFunction(()=>{
          const d=document.querySelector('[role=dialog]');
          if(!d)return false;
          const rect=d.getBoundingClientRect();
          return Math.abs(rect.width-d.offsetWidth)<1.2 && d.getAnimations().every(a=>a.playState!=='running');
        },null,{timeout:10000});
        // Le notifiche dell'iframe e la viewport virtuale richiedono un
        // altro breve assestamento, soprattutto in WebKit sotto carico.
        await page.waitForTimeout(600);
        const dimensions = await frame.locator('[data-crop-footer]').evaluate(footer => {
          const plain = r => ({left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height});
          const f = footer.getBoundingClientRect();
          const dialog=footer.closest('[role=dialog]');
          const d=dialog.getBoundingClientRect();
          const items=[...footer.querySelectorAll(':scope > button')].map(el=>{
            const r=el.getBoundingClientRect(), st=getComputedStyle(el);
            const radius=Math.min(parseFloat(st.borderTopLeftRadius)||0,r.width/2,r.height/2);
            const textRanges=[]; const words=[];
            for(const node of el.childNodes) if(node.nodeType===Node.TEXT_NODE && node.textContent.trim()) {
              const range=document.createRange();range.selectNodeContents(node);
              for(const x of range.getClientRects()) textRanges.push(plain(x));
              for(const m of node.textContent.matchAll(/\S+/g)){
                const one=document.createRange();one.setStart(node,m.index);one.setEnd(node,m.index+m[0].length);
                words.push({word:m[0],lines:one.getClientRects().length});
              }
            }
            const insideRounded=textRanges.every(t=>{
              const a=Math.max(0,radius-(t.top-r.top),radius-(r.bottom-t.top));
              const b=Math.max(0,radius-(t.bottom-r.top),radius-(r.bottom-t.bottom));
              const inset=Math.max(radius-Math.sqrt(Math.max(0,radius**2-a**2)),radius-Math.sqrt(Math.max(0,radius**2-b**2)));
              return t.left>=r.left+inset-0.5 && t.right<=r.right-inset+0.5 && t.top>=r.top-1 && t.bottom<=r.bottom+1;
            });
            const icon=el.querySelector('svg');
            const ir=icon?plain(icon.getBoundingClientRect()):null;
            const hit=document.elementFromPoint((r.left+r.right)/2,(r.top+r.bottom)/2);
            return {name:el.textContent.trim(),rect:plain(r),textRanges,words,insideRounded,icon:ir,scrollWidth:el.scrollWidth,clientWidth:el.clientWidth,scrollHeight:el.scrollHeight,clientHeight:el.clientHeight,hit:!!hit&&(hit===el||el.contains(hit)),hitElement:hit?`${hit.tagName}.${hit.className?.baseVal??hit.className}`:null,hitHtml:hit?.outerHTML?.slice(0,200)??null,background:st.backgroundColor,color:st.color,fontSize:st.fontSize};
          });
          return {footer:plain(f), dialog:plain(d), scrollWidth:footer.scrollWidth,clientWidth:footer.clientWidth,items, font:parseFloat(getComputedStyle(document.documentElement).fontSize)};
        });
        const footerBox=await frame.locator('[data-crop-footer]').boundingBox();
        const dialogBox=await dialog.boundingBox();
        const heading=await dialog.evaluate(root=>{
          const title=root.querySelector('[data-slot="dialog-title"]');
          const close=root.querySelector('[data-slot="dialog-close"]');
          const rect=r=>({left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height});
          if(!title||!close)return null;
          const range=document.createRange();range.selectNodeContents(title);
          return {title:[...range.getClientRects()].filter(r=>r.width>0&&r.height>0).map(rect),close:rect(close.getBoundingClientRect()),dialog:rect(root.getBoundingClientRect()),viewport:innerWidth};
        });
        const overlap=(a,b)=>Math.min(a.right,b.right)-Math.max(a.left,b.left)>1&&Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top)>1;
        const itemBoxes=[];
        for(const item of await frame.locator('[data-crop-footer] > button').all()) itemBoxes.push(await item.boundingBox());
        check('quattro comandi nello stesso riquadro',dimensions.items.length===4,dimensions.items.map(x=>x.name));
        check('fattore di ingrandimento effettivo',Math.abs(dimensions.font-16*s.scale)<0.2,dimensions.font);
        check('finestra e comandi interamente visibili',!!dialogBox&&!!footerBox&&dialogBox.y>=-1&&dialogBox.y+dialogBox.height<=s.height+1&&footerBox.y>=dialogBox.y-1&&footerBox.y+footerBox.height<=Math.min(s.height,dialogBox.y+dialogBox.height)+1,{dialogBox,footerBox});
        check('titolo non sovrapposto alla X di chiusura',!!heading&&heading.title.length>0&&heading.title.every(t=>!overlap(t,heading.close)&&t.left>=heading.dialog.left-1&&t.right<=heading.dialog.right+1),heading);
        check('titolo centrato nel dialogo',!!heading&&heading.title.every(t=>Math.abs((t.left+t.right-heading.dialog.left-heading.dialog.right)/2)<=4),heading);
        check('cornice stretta: X con area touch minima',!!heading&&(heading.viewport>285||(heading.close.width>=44&&heading.close.height>=44)),heading);
        check('footer senza overflow orizzontale',dimensions.scrollWidth<=dimensions.clientWidth+1,{scrollWidth:dimensions.scrollWidth,clientWidth:dimensions.clientWidth});
        check('tutti i pulsanti entro footer e viewport',dimensions.items.every((b,i)=>b.rect.left>=dimensions.footer.left-1&&b.rect.right<=dimensions.footer.right+1&&b.rect.top>=dimensions.footer.top-1&&b.rect.bottom<=dimensions.footer.bottom+1&&itemBoxes[i]&&itemBoxes[i].x>=-1&&itemBoxes[i].x+itemBoxes[i].width<=s.width+1&&itemBoxes[i].y>=-1&&itemBoxes[i].y+itemBoxes[i].height<=s.height+1),{items:dimensions.items,outer:itemBoxes});
        check('area touch minima 44 x 44',dimensions.items.every(b=>b.rect.width>=44&&b.rect.height>=44),dimensions.items.map(b=>({name:b.name,rect:b.rect})));
        check('testi completi senza taglio o parole spezzate',dimensions.items.every(b=>b.textRanges.length>0&&b.scrollWidth<=b.clientWidth+1&&b.scrollHeight<=b.clientHeight+1&&b.words.every(w=>w.lines===1)&&b.textRanges.every(t=>t.left>=b.rect.left-1&&t.right<=b.rect.right+1&&t.top>=b.rect.top-1&&t.bottom<=b.rect.bottom+1)),dimensions.items);
        check('testi entro gli angoli arrotondati',dimensions.items.every(b=>b.insideRounded),dimensions.items.map(({name,insideRounded,textRanges,rect})=>({name,insideRounded,textRanges,rect})));
        check('icone contenute nei pulsanti',dimensions.items.every(b=>!b.icon||(b.icon.left>=b.rect.left-1&&b.icon.right<=b.rect.right+1&&b.icon.top>=b.rect.top-1&&b.icon.bottom<=b.rect.bottom+1)),dimensions.items.map(({name,icon,rect})=>({name,icon,rect})));
        check('nessuna sovrapposizione fra pulsanti',dimensions.items.every((a,i)=>dimensions.items.slice(i+1).every(b=>!overlap(a.rect,b.rect))),dimensions.items.map(({name,rect})=>({name,rect})));
        check('icone e testo non si sovrappongono',dimensions.items.every(b=>!b.icon||b.textRanges.every(t=>!overlap(b.icon,t))),dimensions.items.map(({name,icon,textRanges})=>({name,icon,textRanges})));
        const scrollArea=frame.locator('[data-crop-scroll]');
        const bodyHeight=await scrollArea.evaluate(el=>el.clientHeight);
        const scrollBox=await scrollArea.boundingBox();
        const imageBox=await frame.locator('[role=dialog] img').boundingBox();
        const photoVisible=scrollBox&&imageBox?Math.max(0,Math.min(scrollBox.y+scrollBox.height,imageBox.y+imageBox.height)-Math.max(scrollBox.y,imageBox.y)):0;
        check('spazio residuo per foto e scroll',bodyHeight>=80&&photoVisible>=32&&scrollBox.y+scrollBox.height<=footerBox.y+1,{bodyHeight,photoVisible,scrollBox,imageBox,footerBox});
        check('pulsanti raggiungibili al centro',dimensions.items.every(b=>b.hit),dimensions.items.map(({name,hit,hitElement,hitHtml,rect})=>({name,hit,hitElement,hitHtml,rect})));
        check('colori e nomi conservati',dimensions.items.map(b=>b.name.toLowerCase()).join('|')==='ruota sinistra|ruota destra|chiudi|ritaglia'&&dimensions.items.every(b=>b.background==='rgb(168, 91, 60)'&&b.color==='rgb(255, 255, 255)'),dimensions.items.map(({name,background,color})=>({name,background,color})));
        check('modalità e lock conservati',await frame.evaluate(()=>document.documentElement.hasAttribute('data-lf-crop-open')&&getComputedStyle(document.body).position==='fixed'));
        await page.screenshot({path:`${out}/${engine}-${s.name}.png`});
        // Test di azionamento: destra e sinistra tornano alla stessa dimensione.
        await frame.getByRole('button',{name:'Ruota la foto di 90 gradi a destra'}).click({timeout:6000});
        await frame.waitForFunction(()=>{const i=document.querySelector('[role=dialog] img');return i?.naturalWidth===1200&&i?.naturalHeight===900});
        await frame.getByRole('button',{name:'Ruota la foto di 90 gradi a sinistra'}).click({timeout:6000});
        await frame.waitForFunction(()=>{const i=document.querySelector('[role=dialog] img');return i?.naturalWidth===900&&i?.naturalHeight===1200});
        check('entrambi i comandi rotazione funzionano',true);
        if(s.name==='telefono-320'||s.name==='blog-320-font160'||s.name==='blog-390-font160-contrasto'||s.name==='desktop') {
          await frame.getByRole('button',{name:'Ritaglia',exact:true}).click({timeout:6000});
          await dialog.waitFor({state:'detached'});
          await frame.waitForFunction(()=>document.querySelector('textarea')?.value==='Puella rosam videt.');
          check('conferma crop e OCR simulato',uploads===1,{uploads});
        } else if(s.name==='blog-280-fallback-font160') {
          await dialog.locator('[data-slot="dialog-close"]').tap({timeout:6000});
          await dialog.waitFor({state:'detached'});
          check('X raggiungibile senza invio',uploads===0,{uploads});
        } else {
          await frame.getByRole('button',{name:'Chiudi',exact:true}).click({timeout:6000});
          await dialog.waitFor({state:'detached'});
          check('chiusura raggiungibile senza invio',uploads===0,{uploads});
        }
        check('nessun errore JavaScript',errors.length===0,errors);
        record.ok=record.checks.every(c=>c.ok);
      } catch(error) {
        record.error=String(error);
        await page.screenshot({path:`${out}/${engine}-${s.name}-FAILED.png`}).catch(()=>{});
      }
      results.push(record);
      console.log(engine,s.name,record.ok?'OK':'FAIL',record.checks.filter(c=>!c.ok).map(c=>c.name).join('; '),record.error??'');
      await context.close();
    }
  } finally { await browser.close(); }
}
await fs.writeFile(`${out}/results.json`,JSON.stringify(results,null,2));
console.log(`SCENARI SUPERATI ${results.filter(r=>r.ok).length}/${results.length}; controlli ${results.flatMap(r=>r.checks).filter(c=>c.ok).length}/${results.flatMap(r=>r.checks).length}`);
if(results.some(r=>!r.ok))process.exitCode=1;

