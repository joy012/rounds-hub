# RoundsHub

<p align="center">
  <img src="./assets/images/logo.png" alt="RoundsHub Logo" width="200" />
</p>

<p align="center">
  <strong>Ward & bed management for clinical rounds — fully offline, on device.</strong>
</p>

<p align="center">
  RoundsHub is a local-storage–based mobile app for managing wards, beds, and patient notes during rounds. No account, no server, no internet required. All data stays on your device.
</p>

---

## Features

### Offline-first & local storage

- **100% offline** — No sign-in, no backend, no network. Use it anywhere (wards, clinics, low-connectivity areas).
- **Device-only data** — Ward and patient data is stored locally with **AsyncStorage**. Nothing is sent to the cloud.
- **Persistent** — Data remains until you delete it or uninstall the app. Survives app restarts and device reboots.

### Ward & bed management

- **Department & ward** — Set a department name (e.g. Surgery) and ward number. Edit anytime from the home screen.
- **Bed grid** — View all beds in a responsive grid (3–6 beds per row by screen size). New wards start with 12 beds.
- **Add beds** — Quick add (+1, +2, +3) or custom count (1–50). Remove beds when needed.
- **Empty vs occupied** — Each card shows bed number and status (empty or patient present). Tap a bed to open details.

### Patient & clinical notes

- **Patient info** — Name, age, gender, admission date, and discharge date (with date pickers).
- **Dx (Diagnosis)** — Text notes and optional handwriting/sketch (stored as base64 on device).
- **Plan** — Text notes and optional handwriting/sketch (stored as base64 on device).
- **Investigations** — Table of date, investigation, and findings. Each cell supports text and optional images. Add or remove rows; resize columns and rows for comfortable editing.

### Actions

- **Discharge** — Clear patient data from a bed; the bed stays for reuse. Available from the home grid and bed detail screen.
- **Delete bed** — Remove a bed and its patient data from the ward (with confirmation).
- **Export to PDF** — Generate a PDF for a bed (patient summary, Dx, Plan, Investigations) and share or save via the system share sheet.

### Experience

- **Safe area** — Layout respects device notch, status bar, and navigation so content doesn’t overlap system UI.
- **Theme** — Light/dark mode with a single tap (NativeWind).
- **Responsive** — Optimized for phone and tablet (e.g. fixed-width add buttons and adaptive bed grid on larger screens).
- **Toasts** — Clear feedback for save, add beds, discharge, delete, and export actions.
- **Splash screen** — Branded launch screen (Expo Splash Screen).
- **Accessible** — Clear labels, touch targets, and structure for everyday use in busy environments.

---

## Tech stack

- **[Expo](https://expo.dev/)** (SDK 54) — Build and tooling for iOS, Android, and Web
- **[React Native](https://reactnative.dev/)** (0.81) — UI and native APIs
- **[React](https://react.dev/)** (19) — UI and hooks
- **[Expo Router](https://expo.dev/router)** (v6) — File-based routing with typed routes
- **[NativeWind](https://nativewind.dev/)** (v4) — Tailwind-style styling
- **[React Native Reusables](https://reactnativereusables.com)** / **@rn-primitives** — UI components (Button, Card, Input, Select, Dialog, etc.)
- **[AsyncStorage](https://react-native-async-storage.github.io/async-storage/)** — Local persistence (ward data)
- **expo-print**, **expo-sharing**, **expo-file-system** — PDF generation and share
- **react-native-signature-canvas** — Handwriting/sketch for Dx and Plan
- **react-native-toast-message** — In-app feedback toasts
- **react-native-gesture-handler**, **react-native-reanimated** — Gestures and animations
- **TypeScript** — Typed models and app logic

---

## Getting started

### Prerequisites

- Node.js 18+
- [pnpm](https://pnpm.io/) (or npm / yarn)
- [Expo Go](https://expo.dev/go) on a device, or an iOS/Android simulator

### Install & run

```bash
# Clone the repo (if needed)
git clone <repo-url>
cd rounds-hub

# Install dependencies
pnpm install

# Start the dev server
pnpm dev
```

Then:

- **iOS** — Press `i` in the terminal (Mac with Xcode) or scan the QR code with the Camera app and open in Expo Go.
- **Android** — Press `a` in the terminal or scan the QR code with Expo Go.
- **Web** — Press `w` to open in the browser.

You can develop and test in **Expo Go** without a custom native build.

### Scripts

| Command              | Description                     |
|----------------------|---------------------------------|
| `pnpm dev`           | Start Expo dev server           |
| `pnpm android`       | Start and open Android         |
| `pnpm ios`           | Start and open iOS             |
| `pnpm web`           | Start and open web             |
| `pnpm prebuild:clean`| Clean prebuild (native folders) |
| `pnpm build:apk`     | Android release APK (prebuild + Gradle) |
| `pnpm clean`         | Remove `.expo` and `node_modules` |

---

## Data & privacy

- **Storage** — A single key (`ward_data`) in AsyncStorage holds the whole ward: department, ward number, and list of beds with optional patient data (name, age, gender, admission/discharge dates, Dx/Plan text and images, investigations table with optional per-cell images). No other keys are used for this feature.
- **No telemetry** — The app does not send analytics or usage data by default.
- **No account** — There is no login or user account; everything is local to the device.

---

## Project structure (high level)

```
app/
  _layout.tsx           # Root: GestureHandler, SafeArea, WardProvider, Stack, Toast, splash hide
  (theme)/
    _layout.tsx         # Theme wrapper (light/dark), StatusBar
    index.tsx            # Home: ward header, department/ward card, add beds, bed grid
    bed/[id].tsx         # Bed detail: patient form, Dx, Plan, Investigations, PDF export
assets/images/          # App icon, logo, splash
components/
  ui/                    # Buttons, cards, inputs, select, dialog, date-picker-field, etc.
  ward/                  # bed-card, patient-form, inv-table, inv-cell-editor, text-input-area, modal-confirmation
contexts/
  ward-context.tsx       # Ward state (load/save from AsyncStorage)
lib/                     # types, storage, pdf-export, theme, utils, bed-utils
```

---

## Learn more

- [Expo documentation](https://docs.expo.dev/)
- [React Native documentation](https://reactnative.dev/docs/getting-started)
- [NativeWind](https://nativewind.dev/)
- [React Native Reusables](https://reactnativereusables.com)

---

## Deploy with EAS

To build installable binaries and distribute the app:

- [EAS Build](https://docs.expo.dev/build/introduction/)
- [EAS Submit](https://docs.expo.dev/submit/introduction/)

---

<p align="center">
  <strong>RoundsHub</strong> — Ward & bed management, offline.
</p>
