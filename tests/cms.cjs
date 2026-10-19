const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');
const data = JSON.parse(fs.readFileSync(path.join(root,'content/site.json'),'utf8'));
const server = spawn('python3',['-m','http.server','0','--bind','127.0.0.1'],{cwd:root,env:{...process.env,PYTHONUNBUFFERED:'1'},stdio:['ignore','pipe','pipe']});
let browser;
let passed=0;
async function check(name,fn){await fn();passed++;console.log('PASS',name);}
(async()=>{
  const port=await new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>reject(Error('Server startup timeout')),10000);
    server.stdout.on('data',chunk=>{const m=chunk.toString().match(/port (\d+)/);if(m){clearTimeout(timer);resolve(m[1]);}});
    server.once('error',reject); server.once('exit',code=>reject(Error('Server exited '+code)));
  });
  browser=await chromium.launch({headless:true,...(fs.existsSync('/usr/bin/chromium')?{executablePath:'/usr/bin/chromium'}:{}),args:['--no-sandbox']});
  const page=await browser.newPage();
  const origin=`http://127.0.0.1:${port}`;
  let override=null,failedFetch=false;
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/content/site.json',route=>failedFetch?route.fulfill({status:503,body:'Unavailable'}):route.fulfill({contentType:'application/json',body:JSON.stringify(override??data)}));
  async function load(expected='loaded'){
    await page.goto(origin,{waitUntil:'networkidle'});
    await page.waitForFunction(status=>document.documentElement.dataset.contentStatus===status,expected);
  }
  await check('All original publications and content load',async()=>{await load();assert.equal(await page.locator('.publication').count(),6);assert.equal(await page.locator('.timeline article').count(),3);assert.equal(await page.locator('.social-links a').count(),3);assert.match(await page.locator('h1').innerText(),/Hoang Thi Ngoc Huyen/);});
  await check('Filters still work after dynamic content rendering',async()=>{await page.getByRole('button',{name:'Journal article',exact:true}).click();assert.equal(await page.locator('.publication:visible').count(),1);await page.getByRole('button',{name:'Reports & thesis',exact:true}).click();assert.equal(await page.locator('.publication:visible').count(),3);await page.getByRole('button',{name:'All work',exact:true}).click();});
  await check('New publication and HTTPS links render safely',async()=>{override=structuredClone(data);override.publications.push({...data.publications[0],title:'New research',url:'https://doi.org/10.1234/example',pdf:'https://example.org/paper.pdf'});await load();const a=page.getByRole('link',{name:'New research',exact:false});assert.equal(await a.getAttribute('href'),'https://doi.org/10.1234/example');assert.equal(await a.getAttribute('target'),'_blank');assert.equal(await a.getAttribute('rel'),'noopener noreferrer');assert.equal(await page.locator('.publication').count(),7);});
  await check('All editable sections update from JSON',async()=>{override=structuredClone(data);override.profile.name='Updated researcher';override.about.lead='Updated biography';override.research[0].title='Updated research';override.project.title='Updated project';override.education[0].title='Updated degree';override.languages[0].detail='Updated language';override.experience[0].title='Updated experience';override.contact.email='researcher@example.org';override.contact.instagram='';await load();for(const [sel,value] of [['h1','Updated researcher.'],['.about-copy .lead','Updated biography'],['.research-card h3','Updated research'],['.current-project h3','Updated project'],['.timeline h3','Updated degree'],['.language-box p span','Updated language'],['.experience-grid h3','Updated experience']])assert.equal(await page.locator(sel).first().textContent(),value);assert.equal(await page.locator('.contact-email').getAttribute('href'),'mailto:researcher@example.org');assert.equal(await page.locator('.social-links a').count(),2);});
  await check('Script and HTML payloads display as inert text',async()=>{override=structuredClone(data);override.about.lead='<img src=x onerror="window.pwned=1"><script>window.pwned=2</script>';override.publications[0].title='<svg onload="window.pwned=3">';await load();assert.equal(await page.locator('.about-copy .lead img, .about-copy .lead script, .publication h3 svg').count(),0);assert.equal(await page.evaluate(()=>window.pwned),undefined);assert.equal(await page.locator('.about-copy .lead').textContent(),override.about.lead);});
  for(const url of ['javascript:alert(1)','data:text/html,<script>alert(1)</script>','http://example.org/','//example.org/','https://user:password@example.org/','https://example.org/\nattack','https://']){
    await check('Reject unsafe URL '+JSON.stringify(url),async()=>{override=structuredClone(data);override.publications[0].url=url;await load('fallback');assert.equal(await page.locator('.publication h3 a').count(),0);});
  }
  for(const asset of ['assets/../index.html','assets/portrait.svg','https://example.org/p.png','assets/%2e%2e/secret.png']){
    await check('Reject unsafe portrait '+asset,async()=>{override=structuredClone(data);override.profile.portrait=asset;await load('fallback');assert.equal(await page.locator('.portrait-frame img').getAttribute('src'),'assets/portrait.png');});
  }
  await check('Reject email header injection',async()=>{override=structuredClone(data);override.contact.email='victim@example.org?bcc=attacker@example.org';await load('fallback');});
  await check('Unavailable JSON preserves original page',async()=>{override=null;failedFetch=true;await load('fallback');assert.equal(await page.locator('.publication').count(),6);failedFetch=false;});
  await check('Empty publication list is supported',async()=>{override=structuredClone(data);override.publications=[];await load();assert.equal(await page.locator('.publication').count(),0);assert.match(await page.locator('.publications').textContent(),/will be added/);});
  await check('Mobile navigation and no horizontal overflow',async()=>{override=null;await page.setViewportSize({width:390,height:844});await load();await page.getByRole('button',{name:'Open navigation'}).click();await page.locator('#navigation').getByRole('link',{name:'Research',exact:true}).click();assert.equal(await page.locator('.menu-toggle').getAttribute('aria-expanded'),'false');assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await page.screenshot({path:'/tmp/huyen-cms-mobile.png',fullPage:true});});
  await check('Public page has restrictive CSP',async()=>{const csp=await page.locator('meta[http-equiv="Content-Security-Policy"]').getAttribute('content');assert.match(csp,/script-src 'self'/);assert.match(csp,/object-src 'none'/);assert.match(csp,/form-action 'none'/);assert.equal(await page.locator('script:not([src])').count(),0);});
  await check('Admin portal does not collect credentials or run scripts',async()=>{await page.goto(origin+'/admin/');assert.equal(await page.locator('input,form,script,iframe').count(),0);assert.equal(await page.locator('a.primary').getAttribute('href'),'https://app.pagescms.org/minmin004-hash/personal-website/main');assert.match(await page.locator('meta[http-equiv="Content-Security-Policy"]').getAttribute('content'),/script-src 'none'/);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await page.screenshot({path:'/tmp/huyen-admin-mobile.png',fullPage:true});await page.setViewportSize({width:1440,height:1000});await page.screenshot({path:'/tmp/huyen-admin-desktop.png',fullPage:true});});
  await check('No JavaScript runtime errors',async()=>assert.deepEqual(errors,[]));
  console.log(`\n${passed} checks passed. Hosted authentication/authorization and CMS save are NOT tested here.`);
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{if(browser)await browser.close();server.kill();});
