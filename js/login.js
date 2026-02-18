document.addEventListener('DOMContentLoaded', ()=>{
  const form = document.getElementById('login-form')
  const msg = document.getElementById('login-msg')

  function loadUsers(){
    try{ return JSON.parse(localStorage.getItem('ek_users')||'[]') }catch(e){ return [] }
  }

  form.addEventListener('submit', (e)=>{
    e.preventDefault()
    msg.textContent = ''
    const email = form.email.value.trim().toLowerCase()
    const password = form.password.value
    if(!email || !password){ msg.textContent = 'Remplissez les deux champs.'; return }

    const users = loadUsers()
    const user = users.find(u=>u.email === email)
    if(!user){ msg.textContent = 'Aucun compte pour cette adresse.'; return }
    if(user.passwordHash !== btoa(password)){ msg.textContent = 'Mot de passe incorrect.'; return }

    // Set current user and redirect
    localStorage.setItem('ek_current', JSON.stringify({ id: user.id, name: user.name, email: user.email }))
    window.location.href = 'index.html'
  })
})
