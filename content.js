/* Public content only. Authentication and repository writes live in Pages CMS/GitHub. */
(() => {
  'use strict';
  const text = (value, name, optional = false) => {
    if (optional && (value === undefined || value === null || value === '')) return '';
    if (typeof value !== 'string' || value.length > 12000 || (!optional && !value.trim())) throw new Error(`Invalid ${name}`);
    return value;
  };
  const https = (value, name) => {
    const raw = text(value, name, true);
    if (!raw) return '';
    if (!/^https:\/\//i.test(raw) || /[\s<>"\\\u0000-\u001f\u007f]/.test(raw)) throw new Error(`Invalid HTTPS URL: ${name}`);
    const url = new URL(raw);
    if (!url.hostname || url.username || url.password) throw new Error(`Invalid HTTPS URL: ${name}`);
    return url.href;
  };
  const asset = (value, name, extensions) => {
    const path = text(value, name);
    if (!/^assets\/[A-Za-z0-9_./ -]+$/.test(path) || path.split('/').some(part => part === '..' || part === '.' || !part) || !extensions.includes(path.split('.').pop().toLowerCase())) throw new Error(`Invalid asset: ${name}`);
    return path;
  };
  const list = (value, name, fields) => {
    if (!Array.isArray(value) || value.length > 200) throw new Error(`Invalid list: ${name}`);
    return value.map((item, i) => fields(item, `${name}[${i}]`));
  };
  const record = (value, name, required, optional = []) => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`Invalid ${name}`);
    const result = {};
    required.forEach(key => { result[key] = text(value[key], `${name}.${key}`); });
    optional.forEach(key => { result[key] = text(value[key], `${name}.${key}`, true); });
    return result;
  };
  function validate(data) {
    const profile = record(data.profile, 'profile', ['name','role','tagline','description','university','location']);
    profile.portrait = asset(data.profile.portrait, 'portrait', ['png','jpg','jpeg','webp']);
    profile.cv = asset(data.profile.cv, 'CV', ['pdf']);
    const about = record(data.about, 'about', ['lead']);
    about.paragraphs = list(data.about.paragraphs, 'paragraphs', (v,n) => text(v,n));
    about.tags = list(data.about.tags, 'tags', (v,n) => text(v,n));
    const interests = list(data.interests,'interests',(v,n) => text(v,n));
    const research = list(data.research,'research',(v,n) => record(v,n,['title','description','label']));
    const project = record(data.project,'project',['label','title','description']);
    project.url = https(data.project.url,'project URL');
    const publications = list(data.publications,'publications',(v,n) => {
      const p = record(v,n,['type','year','label','title','authors','source']);
      if (!['article','report','presentation'].includes(p.type) || !/^\d{4}$/.test(p.year)) throw new Error(`Invalid publication: ${n}`);
      p.url = https(v.url,n+'.url'); p.pdf = https(v.pdf,n+'.pdf'); return p;
    });
    const education = list(data.education,'education',(v,n) => record(v,n,['period','title','institution'],['note','status']));
    const languages = list(data.languages,'languages',(v,n) => record(v,n,['name','detail']));
    const experience = list(data.experience,'experience',(v,n) => record(v,n,['period','title','description']));
    const contact = record(data.contact,'contact',['email','description']);
    if (!/^[A-Za-z0-9.!#$%&'*+\/=\?^_`{|}~-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(contact.email)) throw new Error('Invalid email');
    ['facebook','instagram','linkedin'].forEach(k => {contact[k] = https(data.contact[k],k);});
    return {profile,about,interests,research,project,publications,education,languages,experience,contact};
  }
  const node = (tag, className, value) => {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (value !== undefined) el.textContent = value;
    return el;
  };
  const link = (label, href, className) => {
    const el = node('a',className,label);
    el.href = href; el.target = '_blank'; el.rel = 'noopener noreferrer';
    const hint = node('span','sr-only',' (opens in a new tab)'); el.append(hint);
    return el;
  };
  function render(data) {
    // Build off-screen. Invalid content never replaces the existing working page.
    const original = document.querySelector('main');
    const main = original.cloneNode(true);
    const set = (selector,value) => {main.querySelector(selector).textContent = value;};
    const {profile:p,about:a,contact:c} = data;
    const interests=main.querySelector('.research-interests ul');interests.replaceChildren();
    data.interests.forEach(v=>interests.append(node('li','',v)));
    const name = main.querySelector('h1'); name.textContent = p.name; name.append(node('span','accent','.'));
    const role = main.querySelector('.hero-copy .eyebrow');role.replaceChildren(node('span','status-dot'),document.createTextNode(p.role));
    set('.hero-tagline',p.tagline); set('.hero-description',p.description);
    set('.portrait-position','PhD Student, '+p.university);
    set('.portrait-location',p.location);
    const portrait=main.querySelector('.portrait-frame img');portrait.src=p.portrait;portrait.alt='Portrait of '+p.name;
    main.querySelectorAll('a[download], #publications .section-top > a').forEach(el=>{el.href=p.cv;});
    const about=main.querySelector('.about-copy');about.replaceChildren(node('p','lead',a.lead));
    a.paragraphs.forEach(v=>about.append(node('p','',v)));
    const tags=node('div','tags');a.tags.forEach(v=>tags.append(node('span','',v)));about.append(tags);
    const research=main.querySelector('.research-grid');research.replaceChildren();
    data.research.forEach((v,i)=>{const el=node('article','research-card');el.append(node('span','card-symbol',['↗','◎','⌁'][i%3]),node('span','card-number',String(i+1).padStart(2,'0')),node('h3','',v.title),node('p','',v.description),node('div','card-bottom',v.label));research.append(el);});
    set('.current-project .eyebrow',data.project.label);set('.current-project h3',data.project.title);set('.current-project p',data.project.description);
    if(data.project.url)main.querySelector('.current-project h3').replaceChildren(link(data.project.title,data.project.url,'publication-title'));
    const publications=main.querySelector('.publications');publications.replaceChildren();
    data.publications.forEach(v=>{
      const el=node('article','publication');el.dataset.type=v.type;
      const body=node('div');const title=node('h3');title.append(v.url ? link(v.title+' ↗',v.url,'publication-title') : document.createTextNode(v.title));
      body.append(node('span','eyebrow',v.label),title,node('p','',v.authors),node('p','pub-source',v.source));
      if(v.url || v.pdf){
        const actions=node('div','publication-links');
        if(v.url){
          const label={article:'View article ↗',report:'View report / thesis ↗',presentation:'View presentation ↗'}[v.type];
          actions.append(link(label,v.url,'text-link publication-source'));
        }
        if(v.pdf)actions.append(link('Read PDF ↗',v.pdf,'text-link publication-pdf'));
        body.append(actions);
      }
      el.append(node('span','pub-year',v.year),body);publications.append(el);
    });
    if(!data.publications.length)publications.append(node('p','', 'Publications will be added here.'));
    const timeline=main.querySelector('.timeline');timeline.replaceChildren();
    data.education.forEach(v=>{const el=node('article');el.append(node('span','eyebrow',v.period),node('h3','',v.title),node('p','',v.institution));if(v.note)el.append(node('p','muted',v.note));if(v.status)el.append(node('span','pill',v.status));timeline.append(el);});
    const languages=main.querySelector('.language-box');languages.querySelectorAll('p').forEach(el=>el.remove());
    data.languages.forEach(v=>{const el=node('p','',v.name);el.append(node('span','',v.detail));languages.append(el);});
    const experience=main.querySelector('.experience-grid');experience.replaceChildren();
    data.experience.forEach(v=>{const el=node('article');el.append(node('span','eyebrow',v.period),node('h3','',v.title),node('p','',v.description));experience.append(el);});
    set('.contact > p:not(.eyebrow)',c.description);set('.contact-email',c.email+' ↗');main.querySelector('.contact-email').href='mailto:'+c.email;
    const socials=main.querySelector('.social-links');socials.replaceChildren();
    [['facebook','Facebook'],['instagram','Instagram'],['linkedin','LinkedIn']].forEach(([k,label])=>{if(c[k])socials.append(link(label+' ↗',c[k]));});
    set('.contact-bottom > span',p.location.toUpperCase());
    original.replaceWith(main);
    document.title=p.name+' · Researcher';
    document.querySelector('meta[name="description"]').content=p.description;
    document.querySelector('footer > span').textContent=p.name+' · People, place & belonging.';
  }
  fetch('content/site.json',{cache:'no-cache',credentials:'omit'})
    .then(response=>{if(!response.ok)throw new Error('Content unavailable');return response.json();})
    .then(data=>{render(validate(data));document.documentElement.dataset.contentStatus='loaded';})
    .catch(()=>{document.documentElement.dataset.contentStatus='fallback';console.warn('Content could not be loaded safely; showing the saved website version.');});
})();
