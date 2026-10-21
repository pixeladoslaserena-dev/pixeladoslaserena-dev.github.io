'use strict';
(() => {
 const $=s=>document.querySelector(s);
 let d;try{d=JSON.parse($('#site-content').textContent)}catch{ $('main').prepend(Object.assign(document.createElement('p'),{textContent:'No se pudo cargar el contenido. Puedes contactarme en Instagram: @ximelotus.'}));return; }
 const text=(id,value)=>{const el=$('#'+id);if(el)el.textContent=value||''};
 const url=value=>{try{const u=new URL(value,document.baseURI);return ['https:','http:','blob:'].includes(u.protocol)?value:''}catch{return ''}};
 const image=(el,src,alt)=>{el.src=url(src)||'';el.alt=alt||'';el.addEventListener('error',()=>{el.alt='Fotografía temporalmente no disponible';el.style.minHeight='160px'})};
 const wa=category=>'https://wa.me/'+d.contact.whatsapp.replace(/\D/g,'')+'?text='+encodeURIComponent(category?'Hola, Ximena. Me gustaría cotizar una sesión de '+category+'.':d.contact.message);
 const activePhotos=c=>c.photos.filter(p=>!p.hidden&&url(p.src));
 text('hero-title',d.hero.title);text('hero-intro',d.hero.description);text('hero-eyebrow',d.hero.eyebrow);text('location',d.contact.area);
 image($('#hero-photo'),d.hero.image,d.hero.alt);$('#hero-reference').hidden=!d.hero.sample;
 text('about-title',d.about.title);text('about-copy',d.about.description);text('about-quote',d.about.quote);
 const aboutArt=$('#about-art');aboutArt.replaceChildren();aboutArt.classList.toggle('with-photo',!!d.about.image);if(d.about.image&&url(d.about.image)){const im=document.createElement('img');image(im,d.about.image,d.about.alt||'Ximena, fotógrafa de Pixelados');aboutArt.append(im)}else{const quote=document.createElement('span');quote.textContent=d.about.quote;quote.id='about-quote';aboutArt.append(quote)}
 text('contact-title',d.contact.title);text('contact-copy',d.contact.description);
 document.querySelectorAll('[data-whatsapp]').forEach(a=>a.href=wa());
 document.querySelectorAll('[data-instagram]').forEach(a=>{a.href='https://www.instagram.com/'+d.contact.instagram.replace(/[^a-zA-Z0-9_.]/g,'')+'/';a.textContent='@'+d.contact.instagram.replace(/^@/,'')});
 document.querySelectorAll('[data-pixieset]').forEach(a=>a.href=url(d.contact.pixieset)||'#contacto');
 const email=$('#email');if(d.contact.email){email.href='mailto:'+d.contact.email;email.textContent=d.contact.email}else email.hidden=true;
 text('year',new Date().getFullYear());
 $('#demo-notice').hidden=!(d.hero.sample||d.categories.some(c=>activePhotos(c).some(p=>p.sample)));
 $('#category-cards').replaceChildren();
 const modal=$('#portfolio-dialog');let opener;
 function close(){modal.close()}
 modal.querySelector('.close').addEventListener('click',close);
 modal.addEventListener('click',e=>{if(e.target===modal){const r=modal.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)close()}});
 modal.addEventListener('close',()=>{document.body.classList.remove('no-scroll');opener?.focus()});
 d.categories.forEach((c,i)=>{
  const card=document.createElement('button');card.className='card';card.type='button';card.setAttribute('aria-haspopup','dialog');
  const num=document.createElement('div');num.className='card-number';num.textContent='0'+(i+1)+' / PORTAFOLIO';
  const photo=document.createElement('div');photo.className='card-image';const pics=activePhotos(c),cover=pics.find(p=>p.id===c.cover)||pics[0];
  if(cover){const im=document.createElement('img');im.loading='lazy';image(im,cover.src,cover.alt||c.name);photo.append(im)}else{photo.classList.add('empty');photo.textContent='Próximamente, nuevas fotografías'}
  const title=document.createElement('h3');title.textContent=c.name;const desc=document.createElement('p');desc.textContent=c.description;const link=document.createElement('span');link.textContent=pics.length?'Explorar fotografías ↗':'Consultar por una sesión ↗';
  card.append(num,photo,title,desc,link);$('#category-cards').append(card);
  card.addEventListener('click',()=>{opener=card;text('portfolio-title',c.name);text('portfolio-description',c.description);const gal=$('#portfolio-gallery');gal.replaceChildren();
   if(!pics.length){const empty=document.createElement('p');empty.className='empty';empty.textContent='Estoy preparando una selección de este trabajo. Escríbeme para conversar sobre tu proyecto.';gal.append(empty)}
   pics.forEach(p=>{const f=document.createElement('figure');const im=document.createElement('img');im.loading='lazy';image(im,p.src,p.alt||c.name);f.append(im);if(p.title||p.sample){const cap=document.createElement('figcaption');cap.textContent=p.sample?'Imagen de referencia · No es un trabajo de Pixelados':p.title;f.append(cap)}gal.append(f)});
   $('#category-inquiry').href=wa(c.name);modal.showModal();document.body.classList.add('no-scroll');
  });
 });
})();
