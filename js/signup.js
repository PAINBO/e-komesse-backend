// Simple client-side signup handling using localStorage (prototype)
document.addEventListener('DOMContentLoaded', ()=>{
  const form = document.getElementById('signup-form')
  const msg = document.getElementById('signup-msg')

  function loadUsers(){
    try{ return JSON.parse(localStorage.getItem('ek_users')||'[]') }catch(e){ return [] }
  }
  function saveUsers(u){ localStorage.setItem('ek_users', JSON.stringify(u)) }

  form.addEventListener('submit', (e)=>{
    e.preventDefault()
    msg.textContent = ''
    const name = form.name.value.trim()
    const email = form.email.value.trim().toLowerCase()
    const password = form.password.value
    const password2 = form.password2.value

    if(!name || !email || !password) { msg.textContent = 'Veuillez remplir tous les champs.'; return }
    if(password.length < 6){ msg.textContent = 'Le mot de passe doit avoir au moins 6 caractères.'; return }
    if(password !== password2){ msg.textContent = 'Les mots de passe ne correspondent pas.'; return }

    const users = loadUsers()
    if(users.some(u=>u.email === email)){ msg.textContent = 'Un compte existe déjà pour cette adresse e‑mail.'; return }

    const user = { id: Date.now(), name, email, passwordHash: btoa(password), preferences: { theme: 'light', favorites: [], notifications: true } }
    users.push(user)
    saveUsers(users)

    // Auto-login: set current user and redirect to index.html
    localStorage.setItem('ek_current', JSON.stringify({ id: user.id, name: user.name, email: user.email }))
    window.location.href = 'index.html'
  })
})
