<template>
  <div class="app">
    <nav class="nav">
      <RouterLink to="/" class="nav-brand">treklist</RouterLink>
      <div class="nav-right">
        <RouterLink v-if="auth.user" to="/profile" class="nav-link">
          <span class="color-dot" :style="{ background: auth.user.color }" />
          {{ auth.user.username }}
        </RouterLink>
        <RouterLink v-else to="/profile" class="nav-link">sign in</RouterLink>
      </div>
    </nav>
    <main>
      <RouterView />
    </main>
  </div>
</template>

<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router'
import { useAuthStore } from './stores/auth'

const auth = useAuthStore()
</script>

<style>
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

body {
  font-family: 'Inter', system-ui, sans-serif;
  background: #0f1117;
  color: #e8eaf0;
  min-height: 100vh;
}

.app { display: flex; flex-direction: column; min-height: 100vh; }

.nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 2rem;
  height: 56px;
  border-bottom: 1px solid #1e2030;
  position: sticky;
  top: 0;
  background: #0f1117;
  z-index: 100;
}

.nav-brand {
  font-size: 1.2rem;
  font-weight: 700;
  letter-spacing: -0.03em;
  color: #e8eaf0;
  text-decoration: none;
}

.nav-right { display: flex; align-items: center; gap: 1rem; }

.nav-link {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #8b92a8;
  text-decoration: none;
  font-size: 0.9rem;
  transition: color 0.15s;
}
.nav-link:hover { color: #e8eaf0; }

.color-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  display: inline-block;
}

main { flex: 1; }

a { color: inherit; }

button {
  cursor: pointer;
  font-family: inherit;
}

input, select, textarea {
  font-family: inherit;
  background: #1a1d2e;
  border: 1px solid #2a2d3e;
  color: #e8eaf0;
  border-radius: 6px;
  padding: 0.5rem 0.75rem;
  font-size: 0.9rem;
  outline: none;
  transition: border-color 0.15s;
}
input:focus, select:focus, textarea:focus { border-color: #4f9cf9; }

.btn {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.5rem 1.25rem;
  border-radius: 6px;
  border: none;
  font-size: 0.9rem;
  font-weight: 500;
  transition: opacity 0.15s, background 0.15s;
}
.btn:hover { opacity: 0.85; }
.btn-primary { background: #4f9cf9; color: #fff; }
.btn-ghost { background: transparent; border: 1px solid #2a2d3e; color: #8b92a8; }
.btn-ghost:hover { color: #e8eaf0; border-color: #4a4f6a; }
.btn-danger { background: #e05252; color: #fff; }
.btn-sm { padding: 0.3rem 0.75rem; font-size: 0.8rem; }

/* mobile */
@media (max-width: 600px) {
  .nav { padding: 0 1rem; }
  input, select, textarea { font-size: 16px; } /* prevent zoom on iOS */
}
</style>
