// A local, fake "Greenhouse-like" application form for testing the runner against a real browser.
// It never leaves this computer. It records what was POSTed so tests can check what would have been sent.

import http from 'node:http'

const combo = (id, label, options) => `
  <label for="${id}">${label}</label>
  <div class="select__control" onmousedown="openMenu('${id}')" style="border:1px solid #888;padding:4px;display:block;width:320px">
    <div class="select__value-container"><div class="select__input-container">
      <input class="select__input" id="${id}" role="combobox" aria-required="true" aria-expanded="false" type="text" autocomplete="off" style="width:100%">
    </div></div>
  </div>
  <div id="menu-${id}" hidden style="border:1px solid #888;width:320px">${options.map((o, i) => `<div role="option" class="select__option" id="${id}-option-${i}" onclick="pick('${id}','${o}')" style="padding:4px;cursor:pointer">${o}</div>`).join('')}</div>
  <input type="hidden" name="${id}" id="val-${id}">`

const page = (error = '') => `<!doctype html><html><head><title>Job Application for AI Engineer at Fixture Co</title></head><body>
<h1>AI Engineer</h1>
${error ? `<div role="alert">${error}</div>` : ''}
<form id="application-form" method="post" action="/submit" enctype="multipart/form-data">
  <label for="first_name">First Name*</label><input id="first_name" name="first_name" required><br>
  <label for="last_name">Last Name*</label><input id="last_name" name="last_name" required><br>
  <label for="email">Email*</label><input id="email" name="email" type="email" required><br>
  <label for="phone">Phone*</label><input id="phone" name="phone" type="tel" required><br>
  <label for="resume">Resume/CV*</label><input id="resume" name="resume" type="file" required><br>
  ${combo('q_sponsor', 'Do you require visa sponsorship? *', ['Yes', 'No'])}<br>
  ${combo('q_policy', 'AI Policy for Application *', ['Yes', 'No'])}<br>
  <fieldset><legend>Are you legally authorized to work in India? *</legend>
    <label><input type="radio" name="auth" value="yes" required> Yes</label>
    <label><input type="radio" name="auth" value="no"> No</label></fieldset>
  <label for="gender">Gender</label>
  <select id="gender" name="gender"><option value="">Select...</option><option>Male</option><option>Female</option><option>Decline to self-identify</option></select><br>
  <label><input type="checkbox" id="priv" name="priv" required> I acknowledge the Privacy Policy*</label><br>
  <label for="why">Tell us about yourself*</label><textarea id="why" name="why" required></textarea><br>
  <button type="submit">Submit application</button>
</form>
<script>
  function openMenu(id){ document.querySelectorAll('[id^="menu-"]').forEach(m=>m.hidden=true); document.getElementById('menu-'+id).hidden=false; document.getElementById(id).setAttribute('aria-expanded','true') }
  function pick(id,v){
    document.getElementById('menu-'+id).hidden=true; document.getElementById(id).setAttribute('aria-expanded','false');
    document.getElementById('val-'+id).value=v;
    const box=document.getElementById(id).closest('.select__value-container');
    let sv=box.querySelector('.select__single-value'); if(!sv){ sv=document.createElement('div'); sv.className='select__single-value'; box.prepend(sv) } sv.textContent=v;
  }
  document.addEventListener('keydown',e=>{ if(e.key==='Escape') document.querySelectorAll('[id^="menu-"]').forEach(m=>m.hidden=true) })
</script></body></html>`

const THANKS = '<!doctype html><title>Thank you</title><h1>Thank you for applying</h1><p>Your application has been submitted.</p>'

export async function startFixtureServer() {
  const posts = []
  const server = http.createServer((req, res) => {
    if (req.method === 'POST') {
      const chunks = []
      req.on('data', (c) => chunks.push(c))
      req.on('end', () => {
        const body = Buffer.concat(chunks).toString('latin1')
        posts.push({ url: req.url, body })
        res.setHeader('content-type', 'text/html')
        res.end(req.url === '/submit-bad' ? page('Please correct the highlighted fields') : THANKS)
      })
      return
    }
    res.setHeader('content-type', 'text/html')
    res.end(page())
  })
  await new Promise((r) => server.listen(0, '127.0.0.1', r))
  const url = `http://127.0.0.1:${server.address().port}`
  return { url, posts, close: () => new Promise((r) => server.close(r)) }
}

/** A tiny valid-looking PDF, as base64, so the upload field has a real file. */
export const TINY_PDF_B64 = Buffer.from('%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF').toString('base64')
