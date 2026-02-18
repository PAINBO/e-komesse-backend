// account.js — manage user profile, preferences, favorites, export/import
(function(){
  function getUsers(){ try{ return JSON.parse(localStorage.getItem('ek_users')||'[]') }catch(e){ return [] } }
  function saveUsers(u){ localStorage.setItem('ek_users', JSON.stringify(u)) }
  function getCurrent(){ try{ return JSON.parse(localStorage.getItem('ek_current')||'null') }catch(e){ return null } }
  function setCurrent(obj){ localStorage.setItem('ek_current', JSON.stringify(obj)) }
  function findUserById(id){ return getUsers().find(u=>u.id===id) }
  function updateUser(user){ const users=getUsers(); const i=users.findIndex(u=>u.id===user.id); if(i>=0){ users[i]=user; saveUsers(users); } }
  function removeUserById(id){ const users=getUsers().filter(u=>u.id!==id); saveUsers(users) }

  const els = {
    name: document.getElementById('name'),
    email: document.getElementById('email'),
    password: document.getElementById('password'),
    password2: document.getElementById('password2'),
    theme: document.getElementById('theme'),
    notifications: document.getElementById('notifications'),
    saveBtn: document.getElementById('save-btn'),
    logoutBtn: document.getElementById('logout-btn'),
    deleteBtn: document.getElementById('delete-btn'),
    favoritesList: document.getElementById('favorites-list'),
    exportBtn: document.getElementById('export-btn'),
    importBtn: document.getElementById('import-btn'),
    importArea: document.getElementById('import-area')
  }

  const cur = getCurrent()
  if(!cur){ window.location.href='login.html'; return }
  let user = findUserById(cur.id) || cur

  // populate UI
  function applyTheme(pref){ if(pref==='dark') document.documentElement.classList.add('theme-dark'); else document.documentElement.classList.remove('theme-dark') }
  els.name.value = user.name || ''
  els.email.value = user.email || ''
  els.theme.value = (user.preferences && user.preferences.theme) || 'light'
  els.notifications.checked = !!(user.preferences && user.preferences.notifications)
  applyTheme(els.theme.value)

  // load stores to map favorites
  let stores = []
  fetch('data/stores.json').then(r=>r.json()).then(d=>{ stores=d; renderFavorites() }).catch(()=>{ stores=[] })

  function renderFavorites(){ els.favoritesList.innerHTML = ''
    const favs = (user.preferences && user.preferences.favorites) || []
    if(favs.length===0){ els.favoritesList.innerHTML = '<p class="small">Aucun favori pour l\'instant.</p>'; return }
    favs.forEach(id=>{
      const s = stores.find(x=>x.id===id) || { name: id }
      const div = document.createElement('div'); div.className='fav-item'
      div.innerHTML = `<div>${s.name}</div><div><button class="btn-secondary">Voir</button> <button class="btn-secondary remove">Retirer</button></div>`
      div.querySelector('.remove').addEventListener('click', ()=>{
        user.preferences.favorites = user.preferences.favorites.filter(x=>x!==id)
        updateUser(user); setCurrent({ id:user.id, name:user.name, email:user.email }); renderFavorites()
      })
      const view = div.querySelector('button')
      view.addEventListener('click', ()=>{ if(s && s.name) { localStorage.setItem('ek_last_open', s.id); window.location.href='index.html' } })
      els.favoritesList.appendChild(div)
    })
  }

  els.theme.addEventListener('change', ()=>{ applyTheme(els.theme.value) })

  els.saveBtn.addEventListener('click', ()=>{
    const name = els.name.value.trim(); const email = els.email.value.trim(); const p = els.password.value; const p2 = els.password2.value
    if(!name || !email){ alert('Nom et email requis'); return }
    if(p || p2){ if(p!==p2){ alert('Les mots de passe ne correspondent pas'); return } user.passwordHash = p ? btoa(p) : user.passwordHash }
    user.name = name; user.email = email
    user.preferences = user.preferences || { theme:'light', favorites:[] }
    user.preferences.theme = els.theme.value
    user.preferences.notifications = !!els.notifications.checked
    updateUser(user); setCurrent({ id:user.id, name:user.name, email:user.email })
    alert('Profil enregistré')
    renderFavorites()
  })

  els.logoutBtn.addEventListener('click', ()=>{ localStorage.removeItem('ek_current'); window.location.href='index0.html' })

  els.deleteBtn.addEventListener('click', ()=>{
    if(!confirm('Supprimer définitivement votre compte ? Cette action est irréversible.')) return
    removeUserById(user.id); localStorage.removeItem('ek_current'); window.location.href='index0.html'
  })

  els.exportBtn.addEventListener('click', ()=>{
    const payload = JSON.stringify(user, null, 2)
    const blob = new Blob([payload], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `account-${(user.email||'user').replace(/[^a-z0-9@.\-_]/ig,'')}.json`; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url)
  })

  els.importBtn.addEventListener('click', ()=>{
    const txt = els.importArea.value.trim(); if(!txt){ alert('Collez le JSON à importer'); return }
    try{
      const imported = JSON.parse(txt)
      if(!imported.id){ imported.id = 'u_'+Date.now() }
      const users = getUsers().filter(u=>u.id!==imported.id)
      users.push(imported); saveUsers(users); setCurrent({ id: imported.id, name: imported.name, email: imported.email })
      alert('Compte importé et activé'); window.location.reload()
    }catch(e){ alert('JSON invalide') }
  })

  // fill header user-actions
  const ua = document.getElementById('user-actions')
  if(ua) ua.innerHTML = `<span class="user-greet">Bonjour, ${user.name}</span> <a href="index.html" class="btn-secondary">Retour</a>`

})();
