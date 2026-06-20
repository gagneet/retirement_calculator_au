const HEADER_HTML = `
<header class="site-chrome site-chrome--header">
  <div class="site-chrome__inner site-chrome__header-row">
    <a class="site-chrome__brand" href="index.html" aria-label="Australian Retirement Calculator home">
      <img src="assets/logo.svg" alt="" width="36" height="36"><span>Australian Retirement Calculator</span>
    </a>
    <button class="site-chrome__menu-button" type="button" aria-expanded="false" aria-controls="site-navigation">Menu</button>
    <nav class="site-chrome__nav" id="site-navigation" aria-label="Main navigation">
      <a href="index.html">Calculator</a><a href="advanced.html">Advanced Classic</a>
      <a href="advanced-v2.html">Advanced</a><a href="reverse.html">Reverse Planner</a>
      <a href="how-to-use.html">Help</a>
    </nav>
  </div>
</header>`;

const FOOTER_HTML = `
<footer class="site-chrome site-chrome--footer">
  <div class="site-chrome__inner">
    <div class="site-chrome__footer-grid">
      <div class="site-chrome__footer-about">
        <a class="site-chrome__brand" href="index.html"><img src="assets/logo.svg" alt="" width="36" height="36"><span>Retirement Calculator</span></a>
        <p class="site-chrome__footer-copy">Free Australian retirement planning tools using current superannuation, tax and Age Pension assumptions. Your data stays in your browser.</p>
      </div>
      <div><h2 class="site-chrome__footer-title">Calculators</h2><div class="site-chrome__footer-links">
        <a href="index.html">Calculator</a><a href="advanced-v2.html">Advanced Calculator</a><a href="reverse.html">Reverse Planner</a><a href="comparison.html">Compare Scenarios</a>
      </div></div>
      <div><h2 class="site-chrome__footer-title">Learn</h2><div class="site-chrome__footer-links">
        <a href="how-to-use.html">How to Use</a><a href="methodology.html">Methodology</a><a href="assumptions.html">Assumptions</a><a href="smsf-guide.html">SMSF Guide</a>
      </div></div>
      <div><h2 class="site-chrome__footer-title">Support</h2><div class="site-chrome__footer-links">
        <a href="contact.html">Feedback &amp; Contact</a><a href="privacy.html">Privacy</a><a href="terms.html">Terms of Use</a>
      </div></div>
    </div>
    <div class="site-chrome__footer-bottom">
      <p>© 2026 Australian Retirement Calculator. Educational planning tool — not financial advice.</p>
      <p>Made for Australia · Data processed locally</p>
    </div>
  </div>
</footer>`;

export function initializeSiteChrome() {
  document.querySelectorAll('[data-site-header]').forEach((mount) => { mount.outerHTML = HEADER_HTML; });
  document.querySelectorAll('[data-site-footer], [data-replace-with-site-footer]').forEach((mount) => {
    mount.remove();
    document.body.insertAdjacentHTML('beforeend', FOOTER_HTML);
  });

  const page = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.site-chrome__nav a').forEach((link) => {
    if (link.getAttribute('href') === page) link.setAttribute('aria-current', 'page');
  });
  document.querySelectorAll('.site-chrome__menu-button').forEach((button) => {
    const nav = button.parentElement.querySelector('.site-chrome__nav');
    button.addEventListener('click', () => {
      const open = nav.classList.toggle('is-open');
      button.setAttribute('aria-expanded', String(open));
    });
  });
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initializeSiteChrome, { once: true });
else initializeSiteChrome();
