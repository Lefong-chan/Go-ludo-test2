import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import legacy from '@vitejs/plugin-legacy'

export default defineConfig({
  plugins: [
    vue(),
    legacy({
      targets: [
        'Android >= 5',
        'ChromeAndroid >= 49',
        'Chrome >= 49',
        'iOS >= 10',
        'Safari >= 10',
        'Firefox >= 45',
        'Samsung >= 5',
        'not IE 11',
      ],
      additionalLegacyPolyfills: ['whatwg-fetch'],
    }),
  ],
})
