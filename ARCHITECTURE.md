# Todo Tracker - Technical Architecture

## Quick Reference for Interviews

### Tech Stack
- **Frontend**: React 19 + TypeScript
- **Build Tool**: Vite 7
- **Database**: Firebase Firestore (NoSQL, real-time)
- **Deployment**: Vercel (serverless)
- **PWA**: vite-plugin-pwa + Workbox

### Key Concepts to Know

1. **React Hooks Used**
   - `useState` - local component state
   - `useEffect` - side effects (Firestore subscription)

2. **Firebase Firestore**
   - NoSQL document database
   - Real-time sync via `onSnapshot()` listener
   - CRUD: `setDoc()`, `deleteDoc()`, `onSnapshot()`

3. **PWA (Progressive Web App)**
   - Service Worker caches assets for offline use
   - Web App Manifest enables "Add to Home Screen"
   - Workbox handles caching strategies

4. **Vercel Deployment**
   - Automatic HTTPS/SSL
   - CI/CD from git push
   - Edge network CDN

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        iPhone/Browser                        │
│                    (PWA - Add to Home Screen)                │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      Vercel (Hosting)                        │
│              https://demo1-kappa-puce.vercel.app             │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              Static Files (dist/)                    │    │
│  │  - index.html                                        │    │
│  │  - assets/index-*.js (React bundle)                  │    │
│  │  - assets/index-*.css                                │    │
│  │  - sw.js (Service Worker)                            │    │
│  │  - manifest.webmanifest                              │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                  Firebase Firestore                          │
│              (Cloud NoSQL Database)                          │
│                                                              │
│  Collection: "todos"                                         │
│  Document: {                                                 │
│    id: string,                                               │
│    event: string,                                            │
│    frequency: { value: number, unit: string },               │
│    lastExecuteTime: number | null,                           │
│    nextExecuteTime: number,                                  │
│    createdAt: number                                         │
│  }                                                           │
└─────────────────────────────────────────────────────────────┘
```

---

## File Structure

```
Demo1/
├── src/
│   ├── App.tsx          # Main React component (UI + logic)
│   ├── App.css          # Styles (mobile-responsive)
│   ├── firebase.ts      # Firebase configuration
│   ├── main.tsx         # React entry point
│   └── index.css        # Global styles
├── public/
│   ├── icon-192.png     # PWA icon (small)
│   └── icon-512.png     # PWA icon (large)
├── dist/                # Build output (deployed to Vercel)
├── index.html           # HTML template with PWA meta tags
├── vite.config.ts       # Vite + PWA plugin config
├── package.json         # Dependencies
└── tsconfig.json        # TypeScript config
```

---

## How Components Connect

### 1. React App (App.tsx)
```
User Action → State Update → Firebase Write → Real-time Sync → UI Update
```

- **State**: `useState<Todo[]>([])` holds all todos
- **Real-time Listener**: `onSnapshot()` subscribes to Firestore changes
- **CRUD Operations**:
  - Create/Update: `setDoc(doc(db, 'todos', id), todoData)`
  - Delete: `deleteDoc(doc(db, 'todos', id))`

### 2. Firebase (firebase.ts)
```typescript
// Initialize Firebase app with config
const app = initializeApp(firebaseConfig)
// Get Firestore database instance
export const db = getFirestore(app)
```

### 3. PWA (vite.config.ts)
```typescript
VitePWA({
  registerType: 'autoUpdate',  // Auto-update service worker
  workbox: { ... },            // Caching strategy
  manifest: { ... }            // App metadata for install
})
```

### 4. Build & Deploy Flow
```
npm run build
    │
    ├── TypeScript compile (tsc)
    ├── Vite bundle (React → JS)
    ├── PWA plugin generates:
    │   ├── sw.js (Service Worker)
    │   ├── workbox-*.js (Caching library)
    │   └── manifest.webmanifest
    │
    └── Output: dist/

vercel --prod
    │
    └── Uploads dist/ to Vercel CDN
```

---

## Key Code Patterns

### Real-time Firestore Subscription
```typescript
// App.tsx:60-66
useEffect(() => {
  const unsubscribe = onSnapshot(collection(db, 'todos'), (snapshot) => {
    const items = snapshot.docs.map(doc => doc.data() as Todo)
    setTodos(items)
  })
  return () => unsubscribe()  // Cleanup on unmount
}, [])
```

### Date/Time Calculations
```typescript
// Convert frequency to milliseconds
const frequencyToMs = (f: { value: number; unit: FrequencyUnit }) => {
  const ms = { hours: 3600000, days: 86400000, weeks: 604800000, months: 2592000000 }
  return f.value * ms[f.unit]
}

// Next execute = last execute + frequency
nextExecuteTime = lastExecuteTime + frequencyToMs(frequency)
```

### Mobile-Responsive CSS
```css
@media (max-width: 768px) {
  /* Stack elements vertically, reduce padding */
}
```

---

## Interview Q&A

**Q: Why Firestore over localStorage?**
A: Cross-device sync. localStorage is browser-specific; Firestore syncs data across all devices in real-time.

**Q: What is a Service Worker?**
A: A script that runs in the background, intercepts network requests, and enables offline caching. It's what makes PWAs work offline.

**Q: Why Vite over Create React App?**
A: Faster dev server (native ES modules), faster builds, better plugin ecosystem, smaller bundle size.

**Q: How does real-time sync work?**
A: `onSnapshot()` creates a WebSocket-like connection to Firestore. When any client writes data, Firestore pushes the change to all connected clients instantly.

**Q: What's in the manifest.webmanifest?**
A: App metadata (name, icons, theme color, display mode) that tells the browser how to install and display the PWA.

---

## URLs & Resources

- **Live App**: https://demo1-kappa-puce.vercel.app
- **GitHub**: https://github.com/veraarev1/To-do-list-tracker
- **Firebase Console**: https://console.firebase.google.com (project: to-do-tracker-bbfeb)
- **Vercel Dashboard**: https://vercel.com/dashboard

---

## Commands Reference

```bash
# Development
npm run dev          # Start dev server (localhost:5173)

# Build
npm run build        # Compile TypeScript + bundle with Vite

# Deploy
vercel --prod        # Deploy to production

# Preview build locally
npm run preview      # Serve dist/ folder locally
```
