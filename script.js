/* Progressive navigation: without JavaScript, all content remains readable. */
(() => {
  const pages = ['about','research','publications','journey','contact'];
  function selectPage(scroll = false) {
    const hash = location.hash.slice(1);
    const current = pages.includes(hash) ? hash : 'about';
    document.querySelectorAll('[data-page]').forEach(panel => {
      const active = panel.dataset.page === current;
      panel.hidden = !active;
      panel.classList.toggle('active', active);
    });
    document.querySelectorAll('#navigation a').forEach(link => {
      if(link.hash === '#'+current)link.setAttribute('aria-current','page');
      else link.removeAttribute('aria-current');
    });
    if(scroll) {
      const panel = document.querySelector('[data-page="'+current+'"]');
      const heading = panel?.querySelector('h2');
      if(heading){heading.tabIndex=-1;heading.focus({preventScroll:true});}
      document.querySelector('.page-content')?.scrollIntoView({block:'start',behavior:'instant'});
    }
  }
  document.addEventListener('click', event => {
    const nav = event.target.closest('#navigation a');
    if(nav && nav.hash === location.hash){event.preventDefault();selectPage(true);}
    const button = event.target.closest('.filter');
    if (!button) return;
    document.querySelectorAll('.filter').forEach(item => {
      const active=item===button;
      item.classList.toggle('active',active);
      item.setAttribute('aria-pressed',String(active));
    });
    document.querySelectorAll('.publication').forEach(item => {
      item.hidden=button.dataset.filter!=='all' && item.dataset.type!==button.dataset.filter;
    });
  });
  window.addEventListener('hashchange',()=>selectPage(true));
  document.addEventListener('content:updated',()=>selectPage());
  selectPage();
})();
