/**
 * Vite Configuration - Optimized for Performance
 * 
 * Build optimizations:
 * - Code splitting for vendor chunks (react, leaflet, recharts)
 * - Manual chunks for better caching
 * - Minification with terser for smaller bundles
 * - Source maps disabled in production for faster builds
 * 
 * @version 2.0.0 - Performance Optimized
 */

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  
  server: {
    host: true,
    port: 8082,
    allowedHosts: [
    'unspouted-mafalda-scannable.ngrok-free.dev'
  ],
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
  
  // ============================================================================
  // BUILD OPTIMIZATIONS
  // ============================================================================
  build: {
    // Target modern browsers for smaller bundles
    target: 'es2020',
    
    // Disable source maps in production for faster builds
    sourcemap: false,
    
    // Chunk size warning limit (500KB)
    chunkSizeWarningLimit: 500,
    
    // Rollup options for code splitting
    rollupOptions: {
      output: {
        // Manual chunk splitting for better caching
        manualChunks: {
          // React core - rarely changes, cache separately
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          
          // Map libraries - large, cache separately
          'vendor-map': ['leaflet', 'react-leaflet'],
          
          // Data fetching and state
          'vendor-data': ['@tanstack/react-query', 'axios'],
          
          // Charts - only loaded on dashboard
          'vendor-charts': ['recharts'],
          
          // UI utilities
          'vendor-ui': ['lucide-react', 'react-hot-toast', 'clsx'],
        },
        
        // Optimize chunk file names for caching
        chunkFileNames: (chunkInfo) => {
          const facadeModuleId = chunkInfo.facadeModuleId
          if (facadeModuleId && facadeModuleId.includes('pages/')) {
            // Page chunks get descriptive names
            return 'pages/[name]-[hash].js'
          }
          return 'chunks/[name]-[hash].js'
        },
        
        // Asset file names
        assetFileNames: 'assets/[name]-[hash][extname]',
        
        // Entry file names
        entryFileNames: 'js/[name]-[hash].js',
      },
    },
    
    // Minification options
    minify: 'terser',
    terserOptions: {
      compress: {
        // Remove console.log in production
        drop_console: true,
        drop_debugger: true,
      },
    },
  },
  
  // ============================================================================
  // OPTIMIZATION OPTIONS
  // ============================================================================
  optimizeDeps: {
    // Pre-bundle these dependencies for faster dev server startup
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      'leaflet',
      'react-leaflet',
      '@tanstack/react-query',
      'axios',
      'lucide-react',
    ],
  },
})