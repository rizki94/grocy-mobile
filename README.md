# Grocy Mobile

A dedicated React Native mobile application for Grocy, optimized for Point of Sale (POS) operations, mobile employee attendance, stock opname, and order approvals.

## Features
- **Mobile Employee Attendance**: Fast PIN-based attendance verification (4–6 digits), GPS location logging, and selfie camera check-in / check-out.
- **Multi-Tenant Architecture**: Dynamic workspace / database selection via `x-database-name` header with automatic tenant database discovery.
- **Mobile POS & Orders**: Simplified interface for scanning barcodes, cart management, and sales transactions.
- **Stock Management & Opname**: Real-time stock status, price request approvals, and stock opname recording.
- **Auto-Update & In-App Installer**: Direct in-app update notifications, background APK download, and one-tap install for Android.
- **Release Automation**: One-command release pipeline via `npm run release` integrated with GitHub Releases.

## Tech Stack
- **Framework**: React Native 0.83.1 (React 19)
- **Language**: TypeScript
- **Styling**: NativeWind (Tailwind CSS for React Native)
- **Icons**: Lucide React Native
- **Networking**: Axios with Multi-Tenant & JWT Interceptors
- **Device Features**: Vision Camera, Image Picker, Geolocation, Device Info, Silent Installer

## Getting Started

### Prerequisites
- Node.js >= 20
- Android Studio / Android SDK
- [grocy-server](https://github.com/rizki94/grocy-server) running and accessible.

### Installation & Development
1. Install dependencies:
   ```sh
   npm install
   ```
2. Start the Metro bundler:
   ```sh
   npm start
   ```
3. Run on Android emulator / device:
   ```sh
   npm run android
   ```

### Publishing Releases
To build and publish a new release APK to GitHub Releases:
```sh
npm run release
```
*(Optionally pass a custom version tag: `npm run release -- 2.1.9`)*.

## License
MIT
