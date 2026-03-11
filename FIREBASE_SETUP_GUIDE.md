## Firebase Setup Guide: Creating Test Users

### Quick Steps to Create Test Users:

1. **Go to Firebase Console**
   - Open https://console.firebase.google.com/
   - Select your "haritham-74b4d" project

2. **Navigate to Authentication**
   - In the left sidebar, click **Build** > **Authentication**
   - Click the **Users** tab

3. **Enable Email/Password Authentication** (if not already enabled)
   - Click the **Sign-in method** tab
   - Click **Email/Password**
   - Toggle both "Email/Password" and "Email link (passwordless sign-in)" ON
   - Click **Save**

4. **Create a Test User** (or use the in‑app registration)
   - Go back to the **Users** tab
   - Click **Add user**
   - Enter:
     - **Email:** test@example.com
     - **Password:** Test123456 (min 6 characters)
   - Click **Add user**

   Alternatively, open the app and choose **Register Now** on the login
   screen; fill in the email, password, name and address fields and submit.
   The registration will create the account in Firebase and store profile
   info in the `users` collection.

5. **Create Additional Test Users** (optional)
   - Repeat step 4 with different emails like:
     - admin@example.com / Admin123456
     - user@test.com / User123456

### Now Test in Your App:
- Use the created email and password in the Resident login tab
- Example: test@example.com / Test123456

### To View Created Users:
- In Firebase Console > Authentication > Users tab
- You'll see all created users with their creation date and last sign-in

### Troubleshooting:
- **Still getting "invalid-credential"?**
  - Double-check the email and password are exactly as you created them
  - Ensure Email/Password auth method is enabled in Sign-in method tab
  - Try refreshing the browser/app

- **Want to delete a user?**
  - In Users tab, click the three dots next to the user and select Delete
