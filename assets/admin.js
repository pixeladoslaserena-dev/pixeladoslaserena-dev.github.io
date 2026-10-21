'use strict';
(() => {
 const CFG={owner:'pixeladoslaserena-dev',repo:'pixeladoslaserena-dev.github.io',branch:'main',file:'index.html'};
 const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
 let token='',sha='',source='',data=null,categoryId='',dirty=false,busy=false,revision=0;
 const pending=new Map();
 const endpoint=path=>'https://api.github.com/repos/'+CFG.owner+'/'+CFG.repo+'/contents/'+path.split('/').map(encodeURIComponent).join('/');
 const status=(message,error=false)=>{$('#status').textContent=message;$('#status').className=error?'error':''};
 const mark=()=>{dirty=true;revision++;status('Hay cambios sin publicar. Revisa la vista previa antes de guardar.')};
 const decode=value=>new TextDecoder().decode(Uint8Array.from(atob(value.replace(/\s/g,'')),c=>c.charCodeAt(0)));
 function encode(value){const bytes=new TextEncoder().encode(value);let binary='';for(let i=0;i<bytes.length;i+=32768)binary+=String.fromCharCode(...bytes.subarray(i,i+32768));return btoa(binary)}
 async function api(path,options={}){
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),60000);
  try{const r=await fetch(endpoint(path)+(options.method?'':'?ref='+CFG.branch+'&t='+Date.now()),{...options,signal:controller.signal,headers:{Accept:'application/vnd.github+json',Authorization:'Bearer '+token,'X-GitHub-Api-Version':'2022-11-28',...(options.body?{'Content-Type':'application/json'}:{})}});
   if(!r.ok){let message='';try{message=(await r.json()).message||''}catch{}
    if(r.status===409||r.status===422)throw new Error('El archivo cambió o existe un conflicto. No se sobrescribió. Descarga tu respaldo antes de volver a entrar.');
    if(r.status===401)throw new Error('El token no es válido o ha caducado.');
    if(r.status===403)throw new Error('GitHub rechazó la operación. Revisa la caducidad, los permisos de Contenido y el límite de solicitudes.');
    if(r.status===404)throw new Error('No se encontró el archivo o el token no tiene acceso a este repositorio.');
    throw new Error('GitHub no pudo completar la operación ('+r.status+'). '+message);
   }return await r.json();
  }catch(e){if(e.name==='AbortError')throw new Error('La conexión tardó demasiado. Conserva esta pestaña y vuelve a intentar.');throw e}finally{clearTimeout(timeout)}
 }
 const disabledBefore=new WeakMap();function setBusy(value){busy=value;$$('#workspace button,#workspace input,#workspace textarea,#workspace select').forEach(el=>{if(value){disabledBefore.set(el,el.disabled);el.disabled=true}else if(disabledBefore.has(el)){el.disabled=disabledBefore.get(el);disabledBefore.delete(el)}});$('#publish').textContent=value?'Procesando…':'Guardar y publicar'}
 const category=()=>data.categories.find(c=>c.id===categoryId);
 const getField=path=>path.split('.').reduce((o,k)=>o[k],data);
 const putField=(path,value)=>{const [a,b]=path.split('.');data[a][b]=value};
 function validUrl(value,optional=false){if(!value)return optional;if(/^assets\/photos\/[a-zA-Z0-9_-]+\.webp$/.test(value))return true;try{return new URL(value).protocol==='https:'}catch{return false}}
 function validation(){
  if(!/^\d{8,15}$/.test(data.contact.whatsapp))throw new Error('Escribe WhatsApp con código de país y solo dígitos.');
  if(!/^[a-zA-Z0-9_.]{1,30}$/.test(data.contact.instagram))throw new Error('Revisa el usuario de Instagram: sin @ ni espacios.');
  if(data.contact.email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.contact.email))throw new Error('El correo debe ser una dirección válida o quedar vacío.');
  if(!validUrl(data.contact.pixieset))throw new Error('La galería de clientes necesita un enlace HTTPS válido.');
  if(!data.hero.title.trim()||!data.seo.title.trim()||!data.seo.description.trim())throw new Error('Completa el título de portada y los textos para buscadores.');
  if(!validUrl(data.hero.image)||!validUrl(data.about.image,true)||!validUrl(data.seo.ogImage,true))throw new Error('Revisa las direcciones de las imágenes de portada, retrato y SEO.');
  for(const c of data.categories){if(!c.name.trim())throw new Error('Cada categoría necesita un nombre.');for(const p of c.photos){if(!validUrl(p.src))throw new Error('Hay una dirección de fotografía no válida.');if(!p.hidden&&!p.alt.trim())throw new Error('Agrega una descripción a cada foto visible en '+c.name+'.')}}
  if(data.seo.indexable&&(data.hero.sample||data.categories.some(c=>c.photos.some(p=>p.sample&&!p.hidden))))throw new Error('Reemplaza u oculta las imágenes de referencia antes de activar la indexación.');
 }
 function fillFields(){$$('[data-field]').forEach(el=>{const v=getField(el.dataset.field);if(el.type==='checkbox')el.checked=!!v;else el.value=v||''});refreshHero()}
 function previewSrc(src){return pending.get(src)?.preview||src}
 function refreshHero(){if(data?.hero.image)$('#hero-preview').src=previewSrc(data.hero.image)}
 function renderCategory(){
  const c=category();$('#category-name').value=c.name;$('#category-description').value=c.description;$('#photo-list').replaceChildren();$('#photo-empty').hidden=!!c.photos.length;
  c.photos.forEach((p,index)=>{
   const card=document.createElement('article');card.className='photo-card';const im=document.createElement('img');im.src=previewSrc(p.src);im.alt=p.alt;im.loading='lazy';card.append(im);
   const body=document.createElement('div');body.className='photo-card-body';const meta=document.createElement('div');meta.className='photo-meta';meta.textContent=(p.sample?'REFERENCIA · ':'')+(p.hidden?'OCULTA · ':'')+(c.cover===p.id?'PORTADA DE CATEGORÍA · ':'')+(pending.has(p.src)?'Pendiente de subir':'Guardada');body.append(meta);
   function field(label,value,fn){const lab=document.createElement('label');lab.textContent=label;const input=document.createElement('input');input.value=value||'';input.maxLength=250;input.addEventListener('input',()=>{fn(input.value);mark()});lab.append(input);body.append(lab)}
   field('Título, opcional',p.title,v=>p.title=v);field('Descripción de lo que se ve',p.alt,v=>{p.alt=v;im.alt=v});
   const actions=document.createElement('div');actions.className='photo-actions';
   function button(label,fn,disabled=false){const b=document.createElement('button');b.type='button';b.textContent=label;b.disabled=disabled;b.addEventListener('click',fn);actions.append(b)}
   button('↑',()=>{[c.photos[index-1],c.photos[index]]=[c.photos[index],c.photos[index-1]];mark();renderCategory()},index===0);
   actions.lastChild.setAttribute('aria-label','Mover fotografía hacia arriba');
   button('↓',()=>{[c.photos[index+1],c.photos[index]]=[c.photos[index],c.photos[index+1]];mark();renderCategory()},index===c.photos.length-1);
   actions.lastChild.setAttribute('aria-label','Mover fotografía hacia abajo');
   button('Portada de categoría',()=>{c.cover=p.id;p.hidden=false;mark();renderCategory()});
   button('Usar en portada',()=>{data.hero.image=p.src;data.hero.alt=p.alt;data.hero.sample=!!p.sample;mark();fillFields();status('Portada elegida. Puedes revisarla en Vista previa.')});
   button('Usar como mi retrato',()=>{data.about.image=p.src;data.about.alt=p.alt;mark();fillFields();status('Retrato elegido para Sobre mí. Puedes ocultarlo del portafolio si lo prefieres.')});
   button(p.hidden?'Mostrar':'Ocultar',()=>{p.hidden=!p.hidden;mark();renderCategory()});
   button('Quitar',()=>{if(!confirm('¿Quitar esta foto del portafolio? El archivo ya publicado se conserva para no romper otros enlaces.'))return;c.photos.splice(index,1);if(c.cover===p.id)c.cover='';mark();renderCategory()});
   body.append(actions);card.append(body);$('#photo-list').append(card);
  });
 }
 async function optimise(file){
  if(!['image/jpeg','image/png','image/webp'].includes(file.type))throw new Error(file.name+': usa JPG, PNG o WebP.');
  if(file.size>25*1024*1024)throw new Error(file.name+': supera 25 MB. Exporta una copia más pequeña.');
  const bitmap=await createImageBitmap(file);try{
   if(bitmap.width*bitmap.height>80000000)throw new Error(file.name+': imagen demasiado grande. Exporta una copia de hasta 8.000 píxeles por lado.');
   const scale=Math.min(1,2000/Math.max(bitmap.width,bitmap.height)),canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);
   const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/webp',.84));if(!blob||blob.type!=='image/webp')throw new Error('Tu navegador no permite exportar WebP. Usa una versión reciente de Chrome, Edge o Safari.');
   const base64=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result.split(',')[1]);r.onerror=reject;r.readAsDataURL(blob)});
   return{blob,base64};
  }finally{bitmap.close()}
 }
 function jsonText(value){return JSON.stringify(value,null,2).replace(/</g,'\\u003c').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029')}
 function buildHTML(forPreview=false){
  const doc=new DOMParser().parseFromString(source,'text/html');const copy=structuredClone(data);
  if(forPreview){for(const c of copy.categories)for(const p of c.photos)p.src=previewSrc(p.src);copy.hero.image=previewSrc(copy.hero.image);copy.about.image=previewSrc(copy.about.image)}
  doc.querySelector('#site-content').textContent=jsonText(copy);
  function meta(selector,content){const m=doc.querySelector(selector);if(m)m.setAttribute('content',content)}
  doc.title=data.seo.title;meta('meta[name="description"]',data.seo.description);meta('meta[name="robots"]',data.seo.indexable?'index,follow':'noindex,follow');
  meta('meta[property="og:title"]',data.seo.title);meta('meta[property="og:description"]',data.seo.description);
  meta('meta[property="og:image"]',new URL(data.seo.ogImage||data.hero.image,'https://pixelados.cl/').href);
  const ld={'@context':'https://schema.org','@type':'ProfessionalService',name:data.brand,url:'https://pixelados.cl/',telephone:'+'+data.contact.whatsapp,areaServed:data.contact.area.split(/\s+y\s+|,/).map(s=>s.trim()).filter(Boolean),sameAs:['https://www.instagram.com/'+data.contact.instagram+'/']};
  if(data.contact.email)ld.email=data.contact.email;
  doc.querySelector('#structured-data').textContent=jsonText(ld);
  // Keep the first response meaningful for search engines and visitors before JavaScript.
  for(const [id,value] of Object.entries({'hero-title':copy.hero.title,'hero-intro':copy.hero.description,'hero-eyebrow':copy.hero.eyebrow,location:copy.contact.area,'about-title':copy.about.title,'about-copy':copy.about.description,'about-quote':copy.about.quote,'contact-title':copy.contact.title,'contact-copy':copy.contact.description})){const el=doc.getElementById(id);if(el)el.textContent=value;}
  const hero=doc.getElementById('hero-photo');hero.setAttribute('src',copy.hero.image);hero.setAttribute('alt',copy.hero.alt);doc.getElementById('hero-reference').hidden=!copy.hero.sample;
  doc.getElementById('demo-notice').hidden=!(copy.hero.sample||copy.categories.some(c=>c.photos.some(p=>p.sample&&!p.hidden)));
  const cards=doc.getElementById('category-cards');cards.replaceChildren();
  for(const c of copy.categories){const a=doc.createElement('article');const h=doc.createElement('h3');h.textContent=c.name;const p=doc.createElement('p');p.textContent=c.description;a.append(h,p);const pics=c.photos.filter(p=>!p.hidden);const cover=pics.find(p=>p.id===c.cover)||pics[0];if(cover){const im=doc.createElement('img');im.src=cover.src;im.alt=cover.alt;im.loading='lazy';im.width=600;im.height=750;a.prepend(im)}cards.append(a)}
  const about=doc.getElementById('about-art');about.replaceChildren();about.classList.remove('with-photo');const quote=doc.createElement('span');quote.id='about-quote';quote.textContent=copy.about.quote;about.append(quote);if(copy.about.image){const im=doc.createElement('img');im.src=copy.about.image;im.alt=copy.about.alt;about.replaceChildren(im);about.classList.add('with-photo')}
  if(forPreview){const base=doc.createElement('base');base.href=new URL('.',document.baseURI).href;doc.head.prepend(base)}
  return '<!doctype html>\n'+doc.documentElement.outerHTML;
 }
 async function doLogin(event){
  event.preventDefault();$('#connect').disabled=true;$('#login-status').textContent='Conectando con tu repositorio…';token=$('#token').value.trim();
  try{const result=await api(CFG.file);source=decode(result.content);sha=result.sha;const doc=new DOMParser().parseFromString(source,'text/html');const node=doc.querySelector('#site-content');
   if(!node)throw new Error('Primero instala el nuevo index.html y la carpeta assets del paquete. Esta versión del panel necesita la web actualizada.');
   data=JSON.parse(node.textContent);if(data.version!==2)throw new Error('La web y el panel necesitan la misma versión.');
   $('#token').value='';$('#login').hidden=true;$('#workspace').hidden=false;categoryId=data.categories[0].id;$('#category').replaceChildren();
   data.categories.forEach(c=>{const option=document.createElement('option');option.value=c.id;option.textContent=c.name;$('#category').append(option)});fillFields();renderCategory();dirty=false;status('Conectado · Lectura verificada. Los cambios se envían al pulsar Guardar y publicar.');
  }catch(e){token='';$('#login-status').textContent=e.message;$('#login-status').className='error'}finally{$('#connect').disabled=false}
 }
 $('#login-form').addEventListener('submit',doLogin);
 $('#logout').addEventListener('click',()=>{if(dirty&&!confirm('Hay cambios sin publicar. ¿Salir y descartarlos?'))return;token='';sha='';source='';data=null;dirty=false;for(const p of pending.values())URL.revokeObjectURL(p.preview);pending.clear();$('#workspace').hidden=true;$('#login').hidden=false;$('#login-status').textContent='Sesión cerrada.'});
 $$('[data-tab]').forEach(button=>button.addEventListener('click',()=>{$$('[data-tab]').forEach(b=>b.classList.toggle('active',b===button));$$('.tab').forEach(t=>t.hidden=t.id!=='tab-'+button.dataset.tab);$('#tab-title').textContent=button.textContent.split(' · ')[1]}));
 $$('[data-field]').forEach(input=>input.addEventListener('input',()=>{putField(input.dataset.field,input.type==='checkbox'?input.checked:input.value);mark();if(input.dataset.field==='hero.image')refreshHero()}));
 $('#category').addEventListener('change',()=>{categoryId=$('#category').value;renderCategory()});
 $('#category-name').addEventListener('input',e=>{category().name=e.target.value;$('#category').selectedOptions[0].textContent=e.target.value;mark()});
 $('#category-description').addEventListener('input',e=>{category().description=e.target.value;mark()});
 $('#photo-files').addEventListener('change',async event=>{
  const files=[...event.target.files];if(!files.length)return;const target=category();setBusy(true);let count=0;const errors=[];
  try{for(const file of files){status('Optimizando '+(count+1)+' de '+files.length+'…');try{const result=await optimise(file),id=(crypto.randomUUID?crypto.randomUUID():Array.from(crypto.getRandomValues(new Uint8Array(16)),n=>n.toString(16).padStart(2,'0')).join('')),path='assets/photos/'+target.id+'-'+file.name.replace(/\.[^.]+$/,'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').slice(0,55)+'-'+id.slice(0,8)+'.webp';pending.set(path,{base64:result.base64,preview:URL.createObjectURL(result.blob)});target.photos.push({id,src:path,title:'',alt:file.name.replace(/\.[^.]+$/,'').replace(/[_-]+/g,' '),hidden:false,sample:false});if(!target.cover)target.cover=id;mark();count++}catch(e){errors.push(e.message)}}renderCategory();status(count+' fotografía(s) preparada(s). Aún no se han publicado.'+(errors.length?' '+errors.join(' '):''),!!errors.length)}finally{event.target.value='';setBusy(false)}
 });
 $('#preview').addEventListener('click',()=>{try{validation();$('#preview-frame').srcdoc=buildHTML(true);$('#preview-dialog').showModal()}catch(e){status(e.message,true)}});
 $('#close-preview').addEventListener('click',()=>{$('#preview-dialog').close();$('#preview-frame').srcdoc=''});
 $('#preview-dialog').addEventListener('close',()=>{$('#preview-frame').srcdoc=''});
 $('#backup').addEventListener('click',()=>{const blob=new Blob([buildHTML()],{type:'text/html;charset=utf-8'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='index-respaldo-'+new Date().toISOString().slice(0,10)+'.html';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);status('Respaldo HTML descargado. Las fotos nuevas aún sin publicar no se incluyen en ese archivo; conserva tus originales.')});
 $('#publish').addEventListener('click',async()=>{
  if(busy)return;try{validation()}catch(e){status(e.message,true);return}
  setBusy(true);const savedRevision=revision;
  try{
   status('Comprobando que no haya cambios de otra sesión…');const latest=await api(CFG.file);if(latest.sha!==sha)throw new Error('La web cambió desde que entraste. No se sobrescribió. Descarga un respaldo de tus cambios antes de volver a entrar.');
   const paths=new Set(data.categories.flatMap(c=>c.photos.map(p=>p.src)));paths.add(data.hero.image);if(data.about.image)paths.add(data.about.image);if(data.seo.ogImage)paths.add(data.seo.ogImage);
   const uploads=[...pending.entries()].filter(([path])=>paths.has(path));let count=0;
   for(const [path,item]of uploads){status('Subiendo foto '+(++count)+' de '+uploads.length+'…');if(item.uploaded)continue;
    try{await api(path,{method:'PUT',body:JSON.stringify({message:'Pixelados: añadir fotografía optimizada',content:item.base64,branch:CFG.branch})});item.uploaded=true}
    catch(error){try{const found=await api(path);if(found.content?.replace(/\s/g,'')===item.base64)item.uploaded=true;else throw error}catch{throw error}}
   }
   const html=buildHTML();status('Guardando la web en GitHub…');let result;
   try{result=await api(CFG.file,{method:'PUT',body:JSON.stringify({message:'Pixelados: actualizar portafolio y contenido',content:encode(html),sha,branch:CFG.branch})})}
   catch(error){try{const check=await api(CFG.file);if(decode(check.content)===html)result={content:{sha:check.sha}};else throw error}catch{throw error}}
   sha=result.content.sha;source=html;dirty=revision!==savedRevision;status('Guardado en GitHub. La actualización de la web depende del despliegue de Pages y puede tardar unos minutos.');
   renderCategory();
  }catch(e){status(e.message+' Tus cambios siguen en esta pestaña.',true)}finally{setBusy(false)}
 });
 window.addEventListener('beforeunload',e=>{if(dirty||busy){e.preventDefault();e.returnValue=''}});
})();
