<template>
  <LoginRegister v-if="!isAuthenticated" @auth-success="onAuthSuccess" />
  <Dashboard     v-else                  @logout="onLogout" />
</template>

<script setup>
import { ref } from 'vue'
import LoginRegister from './components/LoginRegister.vue'
import Dashboard from './components/Dashboard.vue'

const isAuthenticated = ref(!!localStorage.getItem('user_token'))

const onAuthSuccess = () => {
  isAuthenticated.value = true
}

const onLogout = () => {
  isAuthenticated.value = false
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
