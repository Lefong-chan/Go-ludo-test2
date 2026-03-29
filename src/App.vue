<template>
  <div id="app-main">
    <div v-if="!isLoggedIn">
      <LoginRegister @auth-success="handleSuccess" />
    </div>
    
    <div v-else>
      <Dashboard @logout="handleLogout" />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import LoginRegister from './components/LoginRegister.vue'
import Dashboard from './components/Dashboard.vue'

const isLoggedIn = ref(false)

onMounted(() => {
  const token = localStorage.getItem('user_token')
  if (token) {
    isLoggedIn.value = true
  }
})

const handleSuccess = () => {
  isLoggedIn.value = true
}

const handleLogout = () => {
  localStorage.clear()
  isLoggedIn.value = false
}
</script>

<style>
body, html, #app {
  margin: 0;
  padding: 0;
  width: 100%;
  height: 100%;
  background-color: #0a111f;
}
#app-main {
  width: 100%;
  min-height: 100vh;
}
</style>
