# Firebase Configuration Security Guide

## 🔐 Security Setup

This project uses a **dual configuration system** to keep your Firebase API keys secure:

### Configuration Files

1. **`firebase-config.js`** (Local Development - Gitignored)
   - Contains your actual Firebase credentials
   - Never committed to GitHub
   - Used for local development

2. **`firebase-config.public.js`** (Production - Committed)
   - Contains placeholder values by default
   - Safe to commit to GitHub
   - Updated with real credentials only when deploying

### Local Development Setup

1. Create `firebase-config.js` in the project root:
```javascript
const firebaseConfig = {
  apiKey: "YOUR_ACTUAL_API_KEY",
  authDomain: "pdc-dashboard-8963a.firebaseapp.com",
  databaseURL: "https://pdc-dashboard-8963a-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "pdc-dashboard-8963a",
  storageBucket: "pdc-dashboard-8963a.firebasestorage.app",
  messagingSenderId: "YOUR_ACTUAL_SENDER_ID",
  appId: "YOUR_ACTUAL_APP_ID"
};

const adminEmails = [
  'your.email@example.com',
];

window.firebaseConfig = firebaseConfig;
window.adminEmails = adminEmails;
```

2. Run locally:
```bash
python -m http.server 8080
```

### Production Deployment

#### Option 1: Using Deployment Scripts (Recommended)

**Windows:**
```cmd
deploy.bat
```

**Linux/Mac:**
```bash
chmod +x deploy.sh
./deploy.sh
```

The script will:
- ✅ Check if `firebase-config.public.js` has real credentials
- ✅ Prevent deployment with placeholder values
- ✅ Deploy to Firebase Hosting

#### Option 2: Manual Deployment

1. **Temporarily** copy your credentials to `firebase-config.public.js`:
```javascript
const firebaseConfig = {
  apiKey: "YOUR_ACTUAL_API_KEY",
  // ... other config values
};
```

2. Deploy:
```bash
firebase deploy
```

3. **IMMEDIATELY** revert `firebase-config.public.js` back to placeholders:
```bash
git checkout firebase-config.public.js
```

### ⚠️ Important Security Notes

1. **Never commit `firebase-config.js`** - It's in `.gitignore`
2. **Always revert `firebase-config.public.js`** after deployment
3. **Set up Firebase Security Rules** to protect your data
4. **API keys in deployed code are normal** - Security is handled by Firebase Rules

### Firebase Security Rules

Set up proper security rules in Firebase Console:

**Realtime Database Rules:**
```json
{
  "rules": {
    "projects": {
      ".read": "auth != null",
      ".write": "auth != null"
    }
  }
}
```

**Auth Configuration:**
1. Go to Firebase Console → Authentication
2. Enable Email/Password authentication
3. Set up authorized domains

### If Your Key is Leaked

If you accidentally commit your API key to GitHub:

1. **Rotate the key immediately:**
   - Go to Firebase Console → Project Settings → General
   - Find your web app
   - Regenerate the API key

2. **Update both config files** with the new key

3. **Redeploy:**
```bash
firebase deploy
```

4. **Remove from Git history** (optional but recommended):
```bash
# Remove sensitive data from all commits
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch app.js" \
  --prune-empty --tag-name-filter cat -- --all

# Force push to remote
git push origin --force --all
```

### Getting Your Firebase Config

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `pdc-dashboard-8963a`
3. Click the gear icon → Project Settings
4. Scroll to "Your apps" → Web apps
5. Copy the config object
6. Paste into `firebase-config.js` (local) or temporarily into `firebase-config.public.js` (for deployment)

### Questions?

If you encounter issues:
1. Check that `firebase-config.js` exists locally
2. Verify credentials are correct
3. Check browser console for error messages
4. Ensure Firebase project is set up correctly

---

**Remember: The security of your Firebase app depends on proper Security Rules, not on hiding API keys!**
