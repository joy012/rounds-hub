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
- **Device-only data** — Ward, patient, personal notes, and preferences are stored locally with **AsyncStorage**. Nothing is sent to the cloud.
- **Persistent** — Data remains until you delete it or uninstall the app. Survives app restarts and device reboots.

### Ward & bed management

- **Department & ward** — Set a department name (e.g. Surgery) and ward number. Edit anytime from the home screen.
- **Bed grid** — View all beds in a responsive grid. New wards start with 12 beds; add or remove beds as needed.
- **Ward layout (beds per row)** — Configure how many beds appear per row (2×2 through 6×6) via the layout control on the department card. Choice is saved and applied across the app.
- **Add beds** — Quick add (+1, +2, +3) or custom count (1–50). Remove beds when needed.
- **Empty vs occupied** — Each card shows bed number and status (empty or patient present). Tap a bed to open details.
- **Ward summary** — At-a-glance counts: total beds, occupied, and documented (with diagnosis). Export the full ward as a single PDF from the same section.

### Patient & clinical notes

- **Patient info** — Name, age, gender, admission date, and discharge date (with date pickers).
- **Dx (Diagnosis)** — Text notes and optional handwriting/sketch (stored as base64 on device).
- **Plan** — Text notes and optional handwriting/sketch (stored as base64 on device).
- **Investigations** — Table of date, investigation, and findings. Each cell supports text and optional images. Add or remove rows; resize columns and rows for comfortable editing.

### Personal hub

- **Sketches** — Standalone drawing pad. Create multiple sketches with titles, pen/eraser, and color options. Export as PDF or PNG via the system share sheet. Stored locally and listed from the Sketches screen.
- **Todo list (checklist)** — Task list with optional due dates. Mark items done, edit or delete, and filter by overdue / due today. All items stored locally.
- **Backup and restore** — Export a full backup as **JSON** (ward, preferences, references, phrases) or as a **PDF** summary. Restore from a previously exported JSON file to replace all app data (ward, references, phrases, settings). Confirmation required before restore.
- **Quick reference** — Reference cards (title + body). Create, edit, reorder, and delete. Stored locally and included in backup/restore.

### Export & share

- **Single bed PDF** — From the bed detail screen, generate a PDF (patient summary, Dx, Plan, Investigations) and share or save via the system share sheet.
- **Ward summary PDF** — From the home screen, export the entire ward (all beds and their patient summary, Dx, Investigations, Plan) as one PDF.
- **Ward data backup** — From Personal → Backup, export ward data (and preferences, references, phrases) as JSON or as a PDF summary for records or transfer to another device via restore.
- **Sketch export** — From a sketch, share as PDF or as PNG image.

### Settings & preferences

- **Theme** — Light, dark, or system. Toggle light/dark from the home header; preference is saved and applied on next launch.
- **Ward layout** — Beds per row (2–6) is saved in preferences and used for the home grid.
- **Defaults** — Default department, ward number, and bed count are stored in preferences and used when creating or resetting the ward.

### Actions

- **Discharge** — Clear patient data from a bed; the bed stays for reuse. Available from the home grid and bed detail screen.
- **Delete bed** — Remove a bed and its patient data from the ward (with confirmation).

### Experience

- **Safe area** — Layout respects device notch, status bar, and navigation so content doesn’t overlap system UI.
- **Theme** — Light/dark mode with a single tap (NativeWind). System theme option supported.
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
- **[AsyncStorage](https://react-native-async-storage.github.io/async-storage/)** — Local persistence (ward, preferences, checklist, sketches, references, backup)
- **expo-print**, **expo-sharing**, **expo-file-system** — PDF generation and share
- **react-native-signature-canvas** — Handwriting/sketch for Dx, Plan, and Sketches (use pen or careful finger input for best results)
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

| Command                  | Description                                      |
|--------------------------|--------------------------------------------------|
| `pnpm dev`               | Start Expo dev server                            |
| `pnpm android`            | Start and open Android                           |
| `pnpm ios`                | Start and open iOS                               |
| `pnpm web`                | Start and open web                               |
| `pnpm prebuild:clean`     | Clean prebuild (native folders)                   |
| `pnpm build:apk`          | Android release APK (prebuild + Gradle)          |
| `pnpm build:apk:release`  | Android release APK (clean prebuild + Gradle)    |
| `pnpm build:aab`          | Android App Bundle for Play Store                |
| `pnpm clean`              | Remove `.expo` and `node_modules`                |

**Android builds** — The project uses a small script (`scripts/ensure-android-sdk.js`) to write `android/local.properties` with your SDK path. If `ANDROID_HOME` is not set, the script tries common default locations (e.g. `~/Library/Android/sdk` on macOS). You can also set `ANDROID_HOME` in your shell profile.

---

## Data & privacy

- **Storage** — Ward data (`ward_data`), user preferences (`user_preferences`), checklist, sketches, references, and optional phrases are stored in AsyncStorage. Backup JSON includes ward, preferences, references, and phrases.
- **No telemetry** — The app does not send analytics or usage data by default.
- **No account** — There is no login or user account; everything is local to the device.

---

## Project structure (high level)

```
app/
  _layout.tsx                 # Root: GestureHandler, SafeArea, WardProvider, Stack, Toast, splash hide
  (theme)/
    _layout.tsx               # Theme wrapper (light/dark/system), StatusBar
    index.tsx                 # Home: ward header, department/ward card, layout, add beds, bed grid, ward PDF
    bed/[id].tsx              # Bed detail: patient form, Dx, Plan, Investigations, single-bed PDF export
    personal/
      index.tsx               # Personal hub: Sketches, Todo list, Backup
      sketches/
        index.tsx             # Sketches list
        [id].tsx              # Sketch canvas (draw, export PDF/PNG)
      checklist.tsx           # Todo list (items, due dates)
      backup.tsx              # Backup (export JSON/PDF, restore from JSON)
      references/
        index.tsx             # Quick reference list
        [id].tsx              # Reference card edit/view
assets/images/                # App icon, logo, splash
components/
  ui/                         # Buttons, cards, inputs, select, dialog, date-picker-field, etc.
  ward/                       # bed-card, patient-form, inv-table, inv-cell-editor, text-input-area, etc.
contexts/
  ward-context.tsx            # Ward state (load/save from AsyncStorage)
lib/                          # types, storage, preferences, pdf-export, backup, theme, checklist-storage,
                              # sketches-storage, references-storage, bed-utils, utils
scripts/
  ensure-android-sdk.js       # Writes android/local.properties for Gradle (SDK path)
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
