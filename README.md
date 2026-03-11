# Haritham
Mini Project 

## Firebase Integration 📦

This app uses Firebase Authentication (email/password for residents and
OTP for officials) and Firestore. Registration now captures email,
password, name and address details and persists extra profile data in
`users` collection.

Below are the steps required to connect the project with your Firebase
console:

1. **Web configuration**
   - The `app/firebase.ts` file already contains your web app's config values.
   - Those values are used when the app runs in a browser (`expo start --web`).
   - If you plan to test phone authentication on web you must include a
div with `id="recaptcha-container"` in the HTML template (e.g.
`web/index.html` or `public/index.html`).

2. **Native configuration (Android/iOS)**
   - Download the `google-services.json` file from your Firebase project settings and place it at the root of the Expo project (`android/app/google-services.json`).
   - Download `GoogleService-Info.plist` and add it to `ios/` (via Xcode or copy into the project root and reference it in `app.json`).
   - Add the `@react-native-firebase/app` plugin to `app.json` if you are using a custom config plugin:
     ```json
     {
       "expo": {
         "plugins": [
           [
             "@react-native-firebase/app",
             {
               "config": {
                 "googleServicesFile": "./google-services.json" // Android only, see docs
               }
             }
           ]
         ]
       }
     }
     ```
   - Run `expo prebuild` or use `eas build` so that the native Firebase SDKs are integrated.

3. **Dependencies**
   - We already added `@react-native-firebase/app`, `@react-native-firebase/auth`, and `@react-native-firebase/firestore`.
   - After editing native config, run `npx pod-install` inside the `ios` directory.

4. **Usage**
   - `app/firebase.ts` exports an initialized `auth` object.
   - `app/services/authService.ts` has been updated to call Firebase methods instead of mocks.
   - The `AuthContext` and login/register screens consume `authService` as before; no UI changes are required.

> Note: because this is an Expo-managed project you must either eject/prebuild to use the native SDKs or switch to the web SDK fully (no `@react-native-firebase` packages). The current setup assumes native capabilities.

