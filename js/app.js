// Frontend search: local dataset + optional web search via backend proxy
let stores = []
let results = []
const pageSize = 6
let currentPage = 1

const el = {
  input: document.getElementById('search-input'),
  suggestions: document.getElementById('suggestions'),
  results: document.getElementById('results'),
  stats: document.getElementById('stats'),
  loading: document.getElementById('loading'),
  webToggle: document.getElementById('web-toggle')
}

// User utilities
function getUsers(){ try{ return JSON.parse(localStorage.getItem('ek_users')||'[]') }catch(e){ return [] } }
function saveUsers(u){ localStorage.setItem('ek_users', JSON.stringify(u)) }
function getCurrent(){ try{ return JSON.parse(localStorage.getItem('ek_current')||'null') }catch(e){ return null } }
function setCurrent(obj){ localStorage.setItem('ek_current', JSON.stringify(obj)) }
function findUserById(id){ return getUsers().find(u=>u.id===id) }
function updateUser(user){ const users=getUsers(); const i=users.findIndex(u=>u.id===user.id); if(i>=0){ users[i]=user; saveUsers(users); } }

function applyUserUI(){
  const cur = getCurrent()
  const ua = document.getElementById('user-actions')
  if(!ua) return
  if(!cur){ ua.innerHTML = `<a href="login.html" class="btn-secondary">Se connecter</a>`; return }
  const user = findUserById(cur.id) || cur
  ua.innerHTML = `<span class="user-greet">Bonjour, ${user.name}</span> <a href="account.html" class="btn-secondary">Mon compte</a> <button id="logout-btn" class="btn-secondary">Déconnexion</button>`
  const btn = document.getElementById('logout-btn')
  if(btn){ btn.addEventListener('click', ()=>{ localStorage.removeItem('ek_current'); window.location.href='index0.html' }) }
  // apply theme
  try{ if(user.preferences && user.preferences.theme === 'dark') document.documentElement.classList.add('theme-dark') }catch(e){}
}

function showLoading(show){
  el.loading.style.display = show ? 'block' : 'none'
}

function debounce(fn, ms=250){
  let t
  return (...args)=>{ clearTimeout(t); t=setTimeout(()=>fn(...args), ms) }
}

function normalize(s){ return (s||'').toString().toLowerCase() }

function computeScore(item, q){
  q = q.toLowerCase()
  let score = 0
  if(item.name.toLowerCase().startsWith(q)) score += 100
  if(item.name.toLowerCase().includes(q)) score += 50
  if(item.category && item.category.toLowerCase().includes(q)) score += 30
  if(item.city && item.city.toLowerCase().includes(q)) score += 20
  if(item.description && item.description.toLowerCase().includes(q)) score += 10
  return score + (item.rating||0)
}

function doSearch(q){
  q = (q||'').trim()
  if(!q){ results = stores.slice(); currentPage=1; renderPage(); renderStats(); hideSuggestions(); return }

  const ql = q.toLowerCase()
  results = stores
    .map(s=>({s,score:computeScore(s,q)}))
    .filter(x=>x.score>0)
    .sort((a,b)=>b.score-a.score)
    .map(x=>x.s)

  currentPage = 1
  renderPage()
  renderStats(q)
}

async function doWebSearch(q){
  if(!q) { /* if empty, just show google UI and return */ return }
  // If Google CSE element is available, use it directly
  const hasCSE = window.google && google.search && google.search.cse && google.search.cse.element && typeof google.search.cse.element.getElement === 'function'
  if(hasCSE){
    try{
      const cseBox = google.search.cse.element.getElement('cse-searchbox')
      if(cseBox && typeof cseBox.execute === 'function'){
        // execute will render results into the cse-results element
        cseBox.execute(q)
        return
      }
    }catch(err){ console.warn('CSE execute failed', err) }
  }

  // Fallback to backend proxy if CSE not available or failed
  showLoading(true)
  el.results.innerHTML = ''
  try{
    const resp = await fetch(`/api/search?q=${encodeURIComponent(q)}`)
    if(!resp.ok){
      const err = await resp.json().catch(()=>({error:resp.statusText}))
      el.results.innerHTML = `<p>Erreur serveur: ${err.error || resp.statusText}</p>`
      showLoading(false)
      return
    }
    const data = await resp.json()
    const items = data.items || []
    if(items.length===0){ el.results.innerHTML = '<p>Aucun résultat web.</p>'; showLoading(false); return }
    el.results.innerHTML = ''
    for(const it of items.slice(0,30)){
      const d = document.createElement('div'); d.className='card'
      const link = it.link ? `<a href="${it.link}" target="_blank" rel="noopener noreferrer">Voir</a>` : ''
      d.innerHTML = `<h3>${it.title || ''}</h3><div class="meta">${link}</div><p>${it.snippet || ''}</p>`
      el.results.appendChild(d)
    }
  }catch(e){
    console.error(e); el.results.innerHTML = `<p>Erreur de recherche web: ${e.toString()}</p>`
  }finally{ showLoading(false) }
}

function renderStats(q){
  const total = results.length
  el.stats.textContent = q ? `${total} résultat(s) pour « ${q} »` : `${stores.length} boutiques` }

function renderPage(){
  el.results.innerHTML = ''
  const start = 0
  const end = currentPage * pageSize
  const pageItems = results.slice(start, end)
  if(pageItems.length===0){ el.results.innerHTML = '<p>Aucun résultat.</p>'; return }
  for(const it of pageItems){
    const div = document.createElement('div'); div.className='card'
    div.innerHTML = `<h3>${it.name}</h3><div class="meta">${it.category || ''} — ${it.city || ''} — ⭐ ${it.rating || '—'}</div><p>${it.description || ''}</p>`
    if(it.tags && it.tags.length){
      const tagWrap = document.createElement('div'); tagWrap.className='tags'
      it.tags.slice(0,5).forEach(t=>{ const sp=document.createElement('span'); sp.className='tag'; sp.textContent=t; tagWrap.appendChild(sp) })
      div.appendChild(tagWrap)
    }
    // favorite button
    const fav = document.createElement('button'); fav.className='btn-secondary'; fav.style.marginTop='8px'
    const cur = getCurrent()
    let favOn = false
    if(cur){ const user=findUserById(cur.id); if(user && user.preferences && Array.isArray(user.preferences.favorites) && user.preferences.favorites.includes(it.id)) favOn=true }
    fav.textContent = favOn ? 'Retirer favori' : 'Ajouter aux favoris'
    fav.addEventListener('click', ()=>{
      const cur2 = getCurrent(); if(!cur2){ window.location.href='login.html'; return }
      const user = findUserById(cur2.id)
      if(!user){ window.location.href='login.html'; return }
      user.preferences = user.preferences || { theme:'light', favorites:[] }
      user.preferences.favorites = user.preferences.favorites || []
      const idx = user.preferences.favorites.indexOf(it.id)
      if(idx>=0){ user.preferences.favorites.splice(idx,1); fav.textContent='Ajouter aux favoris' } else { user.preferences.favorites.push(it.id); fav.textContent='Retirer favori' }
      updateUser(user)
      setCurrent({ id: user.id, name: user.name, email: user.email })
    })
    div.appendChild(fav)
    el.results.appendChild(div)
  }
  showLoading(false)
}

function loadMore(){
  if(currentPage * pageSize >= results.length) return
  currentPage++
  renderPage()
}

function initInfiniteScroll(){
  window.addEventListener('scroll', ()=>{
    if(window.innerHeight + window.scrollY >= document.body.offsetHeight - 180){ loadMore() }
  })
}

function showSuggestions(list){
  el.suggestions.innerHTML = ''
  if(!list || list.length===0){ el.suggestions.style.display='none'; return }
  el.suggestions.style.display='block'
  list.slice(0,8).forEach(s=>{
    const d = document.createElement('div'); d.className='item'; d.textContent = s.name + (s.city?(' — '+s.city):'')
    d.addEventListener('click', ()=>{ el.input.value = s.name; doSearch(s.name); hideSuggestions() })
    el.suggestions.appendChild(d)
  })
}

function hideSuggestions(){ el.suggestions.style.display='none' }

function updateSuggestions(q){
  q = (q||'').toLowerCase().trim()
  if(!q){ hideSuggestions(); return }
  const byNamePrefix = stores.filter(s=>s.name.toLowerCase().startsWith(q))
  const byToken = stores.filter(s=> (s.name+s.category+(s.tags||[]).join(' ')).toLowerCase().includes(q))
  const merged = [...new Map([...byNamePrefix, ...byToken].map(s=>[s.id,s])).values()]
  showSuggestions(merged)
}

function initSearch(){
  el.input.addEventListener('input', debounce((e)=>{
    const q = e.target.value
    const useWeb = el.webToggle && el.webToggle.checked
    if(useWeb){ hideSuggestions(); doWebSearch(q); return }
    // ensure Google UI hidden when typing local
    hideGoogleUI()
    updateSuggestions(q)
    doSearch(q)
  }, 180))

  if(el.webToggle){
    el.webToggle.addEventListener('change', ()=>{
      const q = el.input.value.trim()
      if(el.webToggle.checked){ hideSuggestions(); showGoogleUI(); doWebSearch(q) } else { hideGoogleUI(); doSearch(q) }
    })
  }

  document.addEventListener('click', (ev)=>{ if(!el.suggestions.contains(ev.target) && ev.target !== el.input) hideSuggestions() })

  initInfiniteScroll()
  doSearch('')
}

function showGoogleUI(){
  const g = document.getElementById('google-cse')
  if(g) g.style.display = 'block'
  if(el.input) el.input.style.display = 'none'
  if(el.suggestions) el.suggestions.style.display = 'none'
  if(el.results) el.results.style.display = 'none'
  if(el.stats) el.stats.style.display = 'none'
}

function hideGoogleUI(){
  const g = document.getElementById('google-cse')
  if(g) g.style.display = 'none'
  if(el.input) el.input.style.display = ''
  if(el.results) el.results.style.display = ''
  if(el.stats) el.stats.style.display = ''
}

fetch('data/stores.json').then(r=>r.json()).then(data=>{ stores = data; results = stores.slice(); renderStats(); applyUserUI(); initSearch() }).catch(err=>{ console.error(err); el.results.innerHTML = '<p>Impossible de charger les données.</p>' })
