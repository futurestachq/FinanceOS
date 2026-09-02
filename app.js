// Aggressive cross-origin script error suppression for iOS Safari share sheet / PWA install flow
function isHarmlessScriptError(msg, line) {
  var m = String(msg || '').toLowerCase();
  return (m.indexOf('script error') !== -1) && (line == 0 || line === '0' || line === '');
}
window.onerror = function(msg, url, line, col, err) {
  if (isHarmlessScriptError(msg, line)) {
    console.warn('Cross-origin script error ignored:', url, msg);
    return true; // suppress default browser handling
  }
  document.body.innerHTML = '<div style="padding:40px;font-family:sans-serif;background:#fff;color:#333;"><h2 style="color:#c00">Runtime Error</h2><p><b>' + (err && err.message ? err.message : msg) + '</b></p><pre style="background:#f5f5f5;padding:12px;border-radius:8px;overflow:auto;font-size:12px;">' + (err && err.stack ? err.stack : 'Line ' + line + ': ' + msg) + '</pre><p style="margin-top:20px;color:#666">Please screenshot this and share it so I can fix it.</p></div>';
};
// Backup catcher: some Safari builds fire 'error' events instead of onerror for cross-origin scripts
window.addEventListener('error', function(e) {
  if (e && e.error == null && isHarmlessScriptError(e.message, e.lineno)) {
    e.preventDefault();
    console.warn('Cross-origin script error event suppressed');
  }
});
// Catch unhandled promise rejections from async scripts without crashing the page
window.addEventListener('unhandledrejection', function(e) {
  var reason = e.reason;
  if (reason && typeof reason.message === 'string' && isHarmlessScriptError(reason.message, 0)) {
    e.preventDefault();
    console.warn('Unhandled promise rejection from script error suppressed');
  }
});
try {

// HTML sanitization helper
function escapeHtml(str) {
  if (typeof str !== 'string') return String(str);
  return str.replace(/&/g, '&#38;').replace(/</g, '&#60;').replace(/>/g, '&#62;')
            .replace(/"/g, '&#34;').replace(/'/g, '&#39;');
}

// ============ DATA LAYER ============
const STORAGE_KEY = 'finance_os_data_v1';

// Firebase Config
const firebaseConfig = {
  apiKey: "AIzaSyC6SVgxYzf8B4fBZgyI7xyw1Vf1GvITz5U",
  authDomain: "financeos-12034.firebaseapp.com",
  projectId: "financeos-12034",
  storageBucket: "financeos-12034.firebasestorage.app",
  messagingSenderId: "957373863035",
  appId: "1:957373863035:web:f8e45230f0b30b3708fede"
};
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
let currentUser = null;
let isGuest = true;

const _s = (p) => '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + p + '</svg>';

const categoryIcons = {
  'Food': _s('<path d="M4 2v6c0 1.1.9 2 2 2s2-.9 2-2V2"/><line x1="6" y1="10" x2="6" y2="22"/><line x1="18" y1="2" x2="18" y2="22"/><path d="M18 2c-2.5 0-4 2-4 4.5v4c0 1.1.9 2 2 2h2"/>'),
  'Transportation': _s('<path d="M5 17h14"/><circle cx="7.5" cy="17" r="2"/><circle cx="16.5" cy="17" r="2"/><path d="M5 17H3v-5l2-6h14l2 6v5h-2"/>'),
  'Rent': _s('<path d="M3 12l9-9 9 9"/><path d="M5 10v10h14V10"/><path d="M9 20v-6h6v6"/>'),
  'Utilities': _s('<path d="M13 2L3 14h7l-1 8 10-12h-7l1-8z"/>'),
  'Internet': _s('<circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2c2.5 2.5 4 6 4 10s-1.5 7.5-4 10c-2.5-2.5-4-6-4-10s1.5-7.5 4-10z"/>'),
  'Subscriptions': _s('<path d="M17 1l4 4-4 4"/><path d="M3 11V9a4 4 0 014-4h14"/><path d="M7 23l-4-4 4-4"/><path d="M21 13v2a4 4 0 01-4 4H3"/>'),
  'Family Support': _s('<path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>'),
  'Giving': _s('<path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>'),
  'Education': _s('<path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/>'),
  'Business': _s('<rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"/>'),
  'Entertainment': _s('<rect x="2" y="3" width="20" height="18" rx="2"/><line x1="2" y1="9" x2="22" y2="9"/><line x1="2" y1="15" x2="22" y2="15"/><line x1="8" y1="3" x2="8" y2="21"/><line x1="16" y1="3" x2="16" y2="21"/>'),
  'Health': _s('<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>'),
  'Shopping': _s('<path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/>'),
  'Savings': _s('<path d="M3 21h18"/><path d="M3 10h18"/><path d="M5 6l14-4v18l-14-4z"/><path d="M3 10v11"/><circle cx="12" cy="14" r="1.5"/>'),
  'Investment': _s('<polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>'),
  'Miscellaneous': _s('<path d="M21 16V8l-9-5-9 5v8l9 5 9-5z"/><path d="M3 8l9 5 9-5"/><path d="M12 13v8"/>'),
  'Salary': _s('<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2"/><path d="M6 12h.01M18 12h.01"/>'),
  'Freelance': _s('<rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>'),
  'Bonus': _s('<polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><line x1="12" y1="22" x2="12" y2="7"/><path d="M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z"/>'),
  'Gift': _s('<polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><line x1="12" y1="22" x2="12" y2="7"/><path d="M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z"/>'),
  'Refund': _s('<polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 102.13-9.36L1 10"/>'),
  'Other': _s('<path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/>'),
  'Donations': _s('<path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>'),
  'Charity': _s('<path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>'),
  'Church': _s('<path d="M12 2v3M10 4l4 0"/><path d="M5 21V10l7-5 7 5v11"/><path d="M3 21h18"/><path d="M9 21v-5a3 3 0 016 0v5"/>'),
  'Community': _s('<circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2c2.5 2.5 4 6 4 10s-1.5 7.5-4 10c-2.5-2.5-4-6-4-10s1.5-7.5 4-10z"/>'),
  'Friends': _s('<path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>'),
  'Shield': _s('<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>'),
  'Sun': _s('<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>'),
  'Monitor': _s('<rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>'),
  'Plane': _s('<path d="M2 12h20"/><path d="M13 2l-4 10h6l-4 10"/>'),
  'Smartphone': _s('<rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/>'),
  'Home': _s('<path d="M3 12l9-9 9 9"/><path d="M5 10v10h14V10"/><path d="M9 20v-6h6v6"/>'),
  'Camera': _s('<path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/>'),
  'Briefcase': _s('<rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"/>')
};

const iconEdit = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>';
const iconDelete = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>';
const iconMap = {
  success: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
  warning: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
  danger: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
  info: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>'
};

const expenseCategories = ['Food','Transportation','Rent','Utilities','Internet','Subscriptions','Family Support','Giving','Education','Business','Entertainment','Health','Shopping','Savings','Investment','Miscellaneous'];
const incomeCategories = ['Salary','Freelance','Business','Investment','Gift','Bonus','Refund','Other'];
const givingCategories = ['Family Support','Donations','Charity','Church','Community','Friends'];
const transferCategories = ['Bank to Savings','Savings to Investment','Cash to Bank','Other'];

let state = {
  transactions: [],
  subscriptions: [],
  budgets: {},
  budgetIcons: {},
  goals: [],
  accounts: [],
  balance: 0,
  incomeEvents: [],
  financialEvents: [],
  hasOnboarded: false,
  dashboardLayout: null,
  dashEmptyDismissed: false,
  profile: {
    name: '',
    currency: '₦',
    currencyCode: 'NGN',
    monthStart: 1,
    email: ''
  },
  settings: {
    googleCalendar: {
      connected: false,
      accessToken: null,
      tokenExpiry: null,
      calendarId: null,
      calendars: [],
      clientId: '',
      accountEmail: ''
    },
    syncSubscriptions: true,
    syncBills: true,
    syncSalary: true,
    syncGoals: false,
    defaultReminder: 1,
    notifications: true,
    notifWindow: 7
  }
};

function syncBalanceFromAccounts() {
  const computed = state.accounts.reduce((s, a) => s + (a.balance || 0), 0);
  state.balance = computed;
}

function ensureStateDefaults() {
  if (!state.transactions) state.transactions = [];
  if (!state.subscriptions) state.subscriptions = [];
  if (!state.budgets) state.budgets = {};
  if (!state.budgetIcons) state.budgetIcons = {};
  if (!state.goals) state.goals = [];
  if (!state.accounts) state.accounts = [];
  if (!state.incomeEvents) state.incomeEvents = [];
  if (!state.financialEvents) state.financialEvents = [];
  if (!state.hasOnboarded) state.hasOnboarded = false;
  if (!state.dashEmptyDismissed) state.dashEmptyDismissed = false;
  if (!state.autoRules) state.autoRules = [];
  if (!state.profile) state.profile = { name: '', currency: '₦', currencyCode: 'NGN', monthStart: 1, email: '' };
  if (!state.settings) state.settings = {
    googleCalendar: { connected: false, accessToken: null, tokenExpiry: null, calendarId: null, calendars: [], clientId: '', accountEmail: '' },
    syncSubscriptions: true, syncBills: true, syncSalary: true, syncGoals: false,
    defaultReminder: 1, notifications: true, notifWindow: 7,
    browserNotifs: false,
    pinLock: { enabled: false, pinHash: null }
  };
  if (typeof state.settings.browserNotifs !== 'boolean') state.settings.browserNotifs = false;
  if (!state.settings.pinLock) state.settings.pinLock = { enabled: false, pinHash: null };
  if (!state.shownNotifIds) state.shownNotifIds = [];
  // Ensure postedDates arrays exist for auto-posting recurring items
  state.subscriptions.forEach(s => { if (!s.postedDates) s.postedDates = []; });
  state.incomeEvents.forEach(i => { if (!i.postedDates) i.postedDates = []; });
  // Ensure balance is consistent with accounts
  syncBalanceFromAccounts();
}

async function loadData() {
  // Always try localStorage first as a safety backup
  const localSaved = localStorage.getItem(STORAGE_KEY);
  let localState = null;
  if (localSaved) {
    try { localState = JSON.parse(localSaved); } catch(e) { console.error('localStorage parse error', e); }
  }

  if (currentUser && !isGuest) {
    try {
      const doc = await db.collection('users').doc(currentUser.uid).get();
      if (doc.exists) {
        const data = doc.data();
        const hasRealData = data && data.hasOnboarded === true && (data.transactions && data.transactions.length > 0 || data.accounts && data.accounts.length > 0);
        if (hasRealData) {
          // Safe to load from Firestore — it has real user data
          delete data.updatedAt;
          state = { ...state, ...data };
          ensureStateDefaults();
          localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
          return;
        }
        // Firestore doc exists but is empty/minimal — check localStorage for real data
        if (localState && localState.hasOnboarded === true) {
          console.log('Firestore empty, recovering from localStorage');
          state = { ...state, ...localState };
          ensureStateDefaults();
          saveData(); // upload recovered data to Firestore
          return;
        }
      }
      // No Firestore doc — try localStorage before ever resetting
      if (localState && localState.hasOnboarded === true) {
        console.log('No Firestore doc, loading from localStorage');
        state = { ...state, ...localState };
        ensureStateDefaults();
        saveData(); // upload to Firestore
        return;
      }
      // Truly new user — no Firestore, no localStorage
      resetState();
      ensureStateDefaults();
      saveData();
      return;
    } catch(e) {
      console.error('Firestore load error', e);
      // Firestore read failed — NEVER reset, always prefer localStorage
      if (localState && localState.hasOnboarded === true) {
        console.log('Firestore error, falling back to localStorage');
        state = { ...state, ...localState };
        ensureStateDefaults();
      } else {
        // Even on error, if we have ANY local data, use it
        if (localState) {
          state = { ...state, ...localState };
          ensureStateDefaults();
        } else {
          resetState();
          ensureStateDefaults();
        }
      }
      return;
    }
  }
  // Guest path
  if (localSaved) {
    try { state = JSON.parse(localSaved); } catch(e) { resetState(); }
  } else {
    seedData(); // only seed for first-time guests
  }
  ensureStateDefaults();
}

function resetState() {
  state = {
    transactions: [], subscriptions: [], budgets: {}, budgetIcons: {}, goals: [],
    accounts: [], balance: 0, incomeEvents: [], financialEvents: [], hasOnboarded: false,
    dashboardLayout: null,
    dashEmptyDismissed: false,
    profile: { name: '', currency: '₦', currencyCode: 'NGN', monthStart: 1, email: '' },
    settings: {
      googleCalendar: { connected: false, accessToken: null, tokenExpiry: null, calendarId: null, calendars: [], clientId: '', accountEmail: '' },
      syncSubscriptions: true, syncBills: true, syncSalary: true, syncGoals: false,
      defaultReminder: 1, notifications: true, notifWindow: 7
    }
  };
}

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  if (currentUser && !isGuest) {
    const cleanState = JSON.parse(JSON.stringify(state));
    db.collection('users').doc(currentUser.uid).set({
      ...cleanState,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }).catch(e => console.error('Firestore save error', e));
  }
}

function signInWithGoogle() {
  const provider = new firebase.auth.GoogleAuthProvider();
  auth.signInWithPopup(provider).catch(e => {
    console.error('Google sign-in error:', e.code, e.message, e);
    let msg = 'Google sign-in failed';
    if (e.code === 'auth/internal-error') {
      msg = 'Auth configuration error. If you recently restricted your Firebase API key, make sure to add https://financeos-12034.firebaseapp.com/* to the allowed referrers in Google Cloud Console.';
    } else if (e.code === 'auth/popup-blocked') {
      msg = 'Popup blocked. Please allow popups for this site.';
    } else if (e.code === 'auth/popup-closed-by-user') {
      msg = 'Sign-in cancelled.';
    } else if (e.code === 'auth/unauthorized-domain') {
      msg = 'This domain is not authorized for sign-in. Add it in Firebase Console > Authentication > Settings > Authorized domains.';
    } else {
      msg = 'Google sign-in failed: ' + e.message;
    }
    showToast(msg);
  });
}

function sendPasswordReset() {
  const email = document.getElementById('signInEmail').value.trim();
  if (!email) {
    showToast('Enter your email address first');
    return;
  }
  auth.sendPasswordResetEmail(email)
    .then(() => { showToast('Password reset email sent. Check your inbox.'); })
    .catch(e => { showToast(e.message); });
}

function signInWithEmail() {
  const email = document.getElementById('signInEmail').value.trim();
  const password = document.getElementById('signInPassword').value;
  if (!email || !password) { showToast('Enter email and password'); return; }
  auth.signInWithEmailAndPassword(email, password).catch(e => { showToast(e.message); console.error(e); });
}
window.signInWithEmail = signInWithEmail;

function signUpWithEmail() {
  const email = document.getElementById('signUpEmail').value.trim();
  const password = document.getElementById('signUpPassword').value;
  const confirmPassword = document.getElementById('signUpConfirmPassword').value;
  if (!email || !password) { showToast('Enter email and password'); return; }
  if (password.length < 6) { showToast('Password must be at least 6 characters'); return; }
  if (password !== confirmPassword) { showToast('Passwords do not match'); return; }
  auth.createUserWithEmailAndPassword(email, password).catch(e => { showToast(e.message); console.error(e); });
}
window.signUpWithEmail = signUpWithEmail;

function showSignInMode() {
  document.getElementById('signInForm').style.display = 'flex';
  document.getElementById('signUpForm').style.display = 'none';
  document.getElementById('authSubtitle').textContent = 'Track your money. Build your future.';
  // Clear sign-up fields to avoid confusion
  document.getElementById('signUpEmail').value = '';
  document.getElementById('signUpPassword').value = '';
  document.getElementById('signUpConfirmPassword').value = '';
}
window.showSignInMode = showSignInMode;

function showSignUpMode() {
  document.getElementById('signInForm').style.display = 'none';
  document.getElementById('signUpForm').style.display = 'flex';
  document.getElementById('authSubtitle').textContent = 'Create an account to start tracking your finances.';
  // Pre-fill sign-up email if sign-in email was entered
  const signInEmail = document.getElementById('signInEmail').value;
  if (signInEmail) document.getElementById('signUpEmail').value = signInEmail;
}
window.showSignUpMode = showSignUpMode;

function signOutUser() {
  auth.signOut().then(() => {
    currentUser = null;
    isGuest = true;
    showToast('Signed out');
    location.reload();
  });
}

function continueAsGuest() {
  isGuest = true;
  currentUser = null;
  document.querySelector('.app').style.display = 'flex';
  document.getElementById('landingPage').style.display = 'none';
  document.getElementById('authFormContainer').style.display = 'none';
  hideAuthModal();
  updateUserProfileUI();
  loadData().then(() => {
    ensureStateDefaults();
    autoPostRecurring();
    checkAndShowBrowserNotifications();
    if (!state.hasOnboarded) {
      startOnboardingIfNeeded();
    } else {
      navigate('dashboard');
    }
  }).catch(err => {
    console.error('Guest mode error:', err);
    // Fallback - try to show dashboard anyway
    navigate('dashboard');
  });
}

function showLandingPage() {
  document.querySelector('.app').style.display = 'none';
  document.getElementById('landingPage').style.display = 'block';
  document.getElementById('authFormContainer').style.display = 'none';
}

function showAuthForm() {
  document.querySelector('.app').style.display = 'none';
  document.getElementById('landingPage').style.display = 'none';
  document.getElementById('authFormContainer').style.display = 'block';
}

function showAuthModal() {
  document.getElementById('authOverlay').classList.add('active');
  showLandingPage();
}

function hideAuthModal() {
  document.getElementById('authOverlay').classList.remove('active');
}

function updateUserProfileUI() {
  const avatar = document.getElementById('sidebarUserAvatar');
  const nameEl = document.getElementById('sidebarUserName');
  const emailEl = document.getElementById('sidebarUserEmail');
  const logoutBtn = document.getElementById('sidebarLogoutBtn');
  if (!avatar || !nameEl || !emailEl) return;

  const mobileChip = document.getElementById('mobileProfileChip');
  const mobileAvatar = document.getElementById('mobileProfileAvatar');
  const mobileName = document.getElementById('mobileProfileName');

  function setAvatar(el, photoUrl, fallbackText) {
    if (!el) return;
    if (photoUrl) {
      const img = document.createElement('img');
      img.src = photoUrl;
      img.style.cssText = 'width:100%;height:100%;object-fit:cover;border-radius:50%;';
      img.onerror = function() { el.textContent = fallbackText; };
      el.innerHTML = '';
      el.appendChild(img);
    } else {
      el.textContent = fallbackText;
    }
  }

  if (currentUser && !isGuest) {
    const displayName = currentUser.displayName || currentUser.email?.split('@')[0] || 'User';
    const email = currentUser.email || '';
    const photo = currentUser.photoURL;
    const initial = displayName.charAt(0).toUpperCase();
    nameEl.textContent = displayName;
    emailEl.textContent = email;
    setAvatar(avatar, photo, initial);
    setAvatar(mobileAvatar, photo, initial);
    logoutBtn.style.display = 'inline';
    if (mobileName) mobileName.textContent = displayName.split(' ')[0];
    if (mobileChip) mobileChip.style.display = 'flex';
  } else {
    nameEl.textContent = 'My Account';
    emailEl.textContent = 'Local · Encrypted';
    avatar.textContent = 'U';
    logoutBtn.style.display = 'none';
    if (mobileAvatar) mobileAvatar.textContent = 'U';
    if (mobileName) mobileName.textContent = '';
    if (mobileChip) mobileChip.style.display = 'none';
  }
}

auth.onAuthStateChanged(user => {
  currentUser = user;
  if (user) {
    isGuest = false;
    document.querySelector('.app').style.display = 'flex';
    document.getElementById('landingPage').style.display = 'none';
    document.getElementById('authFormContainer').style.display = 'none';
    hideAuthModal();
    updateUserProfileUI();
    loadData().then(() => {
      // Auto-populate profile from Google if empty
      if (!state.profile) state.profile = {};
      if (!state.profile.name && user.displayName) state.profile.name = user.displayName;
      if (!state.profile.email && user.email) state.profile.email = user.email;
      // Check if PIN lock is enabled
      const pinLock = state.settings.pinLock || {};
      if (pinLock.enabled && pinLock.pinHash) {
        showPinOverlay();
      }
      ensureStateDefaults();
      autoPostRecurring();
      // Pre-initialize GIS token client so Connect button works immediately
      if (isGoogleSignedIn()) initGcalTokenClient();
      checkAndShowBrowserNotifications();
      if (!state.hasOnboarded) {
        startOnboardingIfNeeded();
      } else {
        navigate('dashboard');
      }
    });
  } else {
    showAuthModal();
  }
});

function seedData() {
  const today = new Date();
  const y = today.getFullYear();
  const m = today.getMonth();

  function d(day, month) {
    const dt = new Date(y, month !== undefined ? month : m, day);
    return dt.toISOString().split('T')[0];
  }

  state.transactions = [
    // Current month income
    {id: uid(), date: d(1), amount: 650000, type: 'income', category: 'Salary', description: 'Monthly salary', payment: 'Bank Transfer', tags: ['salary'], notes: ''},
    {id: uid(), date: d(15), amount: 120000, type: 'income', category: 'Freelance', description: 'Web design project', payment: 'Bank Transfer', tags: ['freelance'], notes: ''},
    {id: uid(), date: d(22), amount: 80000, type: 'income', category: 'Business', description: 'Product sales', payment: 'Bank Transfer', tags: ['business'], notes: ''},

    // Current month expenses
    {id: uid(), date: d(2), amount: 180000, type: 'expense', category: 'Rent', description: 'Monthly rent', payment: 'Bank Transfer', tags: ['rent'], notes: ''},
    {id: uid(), date: d(3), amount: 15000, type: 'expense', category: 'Food', description: 'Groceries at Shoprite', payment: 'Card', tags: ['groceries'], notes: ''},
    {id: uid(), date: d(5), amount: 8500, type: 'expense', category: 'Transportation', description: 'Bolt rides', payment: 'Card', tags: ['transport'], notes: ''},
    {id: uid(), date: d(7), amount: 22000, type: 'expense', category: 'Utilities', description: 'Electricity bill', payment: 'Bank Transfer', tags: ['utility'], notes: ''},
    {id: uid(), date: d(8), amount: 12000, type: 'expense', category: 'Food', description: 'Restaurant lunch', payment: 'Card', tags: ['eating-out'], notes: ''},
    {id: uid(), date: d(10), amount: 6500, type: 'expense', category: 'Subscriptions', description: 'Spotify Premium', payment: 'Card', tags: ['subscription'], notes: ''},
    {id: uid(), date: d(10), amount: 15500, type: 'expense', category: 'Subscriptions', description: 'Netflix', payment: 'Card', tags: ['subscription'], notes: ''},
    {id: uid(), date: d(12), amount: 18000, type: 'expense', category: 'Food', description: 'Weekly groceries', payment: 'Card', tags: ['groceries'], notes: ''},
    {id: uid(), date: d(14), amount: 35000, type: 'expense', category: 'Education', description: 'Online course - Udemy', payment: 'Card', tags: ['learning'], notes: ''},
    {id: uid(), date: d(15), amount: 9500, type: 'expense', category: 'Transportation', description: 'Fuel', payment: 'Cash', tags: ['transport'], notes: ''},
    {id: uid(), date: d(16), amount: 25000, type: 'expense', category: 'Shopping', description: 'New shoes', payment: 'Card', tags: ['shopping'], notes: ''},
    {id: uid(), date: d(18), amount: 14500, type: 'expense', category: 'Food', description: 'Dinner with friends', payment: 'Card', tags: ['eating-out'], notes: ''},
    {id: uid(), date: d(20), amount: 5000, type: 'expense', category: 'Health', description: 'Pharmacy', payment: 'Cash', tags: ['health'], notes: ''},

    // Current month giving
    {id: uid(), date: d(5), amount: 50000, type: 'giving', category: 'Family Support', description: 'Support for parents', payment: 'Bank Transfer', tags: ['family'], notes: ''},
    {id: uid(), date: d(12), amount: 20000, type: 'giving', category: 'Church', description: 'Sunday offering', payment: 'Cash', tags: ['church'], notes: ''},
    {id: uid(), date: d(19), amount: 10000, type: 'giving', category: 'Donations', description: 'Charity donation', payment: 'Bank Transfer', tags: ['charity'], notes: ''},

    // Transfers
    {id: uid(), date: d(1), amount: 100000, type: 'transfer', category: 'Bank to Savings', description: 'Monthly savings transfer', payment: 'Bank Transfer', tags: ['savings'], notes: ''},

    // Last month data for trends
    {id: uid(), date: d(1, m-1), amount: 650000, type: 'income', category: 'Salary', description: 'Monthly salary', payment: 'Bank Transfer', tags: ['salary'], notes: ''},
    {id: uid(), date: d(12, m-1), amount: 95000, type: 'income', category: 'Freelance', description: 'Logo design', payment: 'Bank Transfer', tags: ['freelance'], notes: ''},
    {id: uid(), date: d(2, m-1), amount: 180000, type: 'expense', category: 'Rent', description: 'Monthly rent', payment: 'Bank Transfer', tags: ['rent'], notes: ''},
    {id: uid(), date: d(5, m-1), amount: 22000, type: 'expense', category: 'Food', description: 'Groceries', payment: 'Card', tags: ['groceries'], notes: ''},
    {id: uid(), date: d(8, m-1), amount: 18000, type: 'expense', category: 'Food', description: 'Weekly groceries', payment: 'Card', tags: ['groceries'], notes: ''},
    {id: uid(), date: d(10, m-1), amount: 22000, type: 'expense', category: 'Utilities', description: 'Electricity + water', payment: 'Bank Transfer', tags: ['utility'], notes: ''},
    {id: uid(), date: d(15, m-1), amount: 15000, type: 'expense', category: 'Transportation', description: 'Monthly transport', payment: 'Card', tags: ['transport'], notes: ''},
    {id: uid(), date: d(20, m-1), amount: 45000, type: 'giving', category: 'Family Support', description: 'Support for parents', payment: 'Bank Transfer', tags: ['family'], notes: ''},
    {id: uid(), date: d(22, m-1), amount: 30000, type: 'expense', category: 'Shopping', description: 'Clothes', payment: 'Card', tags: ['shopping'], notes: ''},

    // 2 months ago
    {id: uid(), date: d(1, m-2), amount: 650000, type: 'income', category: 'Salary', description: 'Monthly salary', payment: 'Bank Transfer', tags: ['salary'], notes: ''},
    {id: uid(), date: d(10, m-2), amount: 60000, type: 'income', category: 'Freelance', description: 'Consulting', payment: 'Bank Transfer', tags: ['freelance'], notes: ''},
    {id: uid(), date: d(2, m-2), amount: 180000, type: 'expense', category: 'Rent', description: 'Monthly rent', payment: 'Bank Transfer', tags: ['rent'], notes: ''},
    {id: uid(), date: d(8, m-2), amount: 35000, type: 'expense', category: 'Food', description: 'Groceries', payment: 'Card', tags: ['groceries'], notes: ''},
    {id: uid(), date: d(15, m-2), amount: 28000, type: 'expense', category: 'Transportation', description: 'Transport', payment: 'Card', tags: ['transport'], notes: ''},
    {id: uid(), date: d(20, m-2), amount: 40000, type: 'giving', category: 'Family Support', description: 'Support for parents', payment: 'Bank Transfer', tags: ['family'], notes: ''},
  ];

  // Accounts
  state.accounts = [
    { id: uid(), name: 'GTBank', balance: 450000 },
    { id: uid(), name: 'Access Bank', balance: 280000 },
    { id: uid(), name: 'Opay', balance: 75000 },
    { id: uid(), name: 'Cash', balance: 35000 },
  ];

  // Helper to get account id by name
  const gt = state.accounts.find(a => a.name === 'GTBank').id;
  const ac = state.accounts.find(a => a.name === 'Access Bank').id;
  const op = state.accounts.find(a => a.name === 'Opay').id;
  const ca = state.accounts.find(a => a.name === 'Cash').id;

  // Update transactions with account ids
  state.transactions.forEach(t => {
    if (t.type === 'income' && t.category === 'Salary') t.accountId = gt;
    else if (t.type === 'income' && t.category === 'Freelance') t.accountId = ac;
    else if (t.type === 'income' && t.category === 'Business') t.accountId = op;
    else if (t.type === 'expense' && t.category === 'Rent') t.accountId = gt;
    else if (t.type === 'expense' && (t.category === 'Food' || t.category === 'Transportation' || t.category === 'Shopping' || t.category === 'Subscriptions')) t.accountId = (t.payment === 'Cash') ? ca : ac;
    else if (t.type === 'expense' && (t.category === 'Utilities' || t.category === 'Education')) t.accountId = gt;
    else if (t.type === 'expense' && t.category === 'Health') t.accountId = ca;
    else if (t.type === 'giving') t.accountId = gt;
    else if (t.type === 'transfer') { t.fromAccountId = gt; t.toAccountId = ac; t.accountId = gt; }
  });

  // Subscriptions
  const now = new Date();
  state.subscriptions = [
    {id: uid(), name: 'Spotify', cost: 6500, cycle: 'monthly', renewal: addDays(now, 3), category: 'Entertainment', notes: '', status: 'active', logo: 'spotify'},
    {id: uid(), name: 'Netflix', cost: 15500, cycle: 'monthly', renewal: addDays(now, 7), category: 'Entertainment', notes: '', status: 'active', logo: 'netflix'},
    {id: uid(), name: 'ChatGPT Plus', cost: 25000, cycle: 'monthly', renewal: addDays(now, 14), category: 'Software', notes: '', status: 'active', logo: 'chatgpt'},
    {id: uid(), name: 'iCloud Storage', cost: 3900, cycle: 'monthly', renewal: addDays(now, 20), category: 'Cloud Storage', notes: '', status: 'active', logo: 'apple'},
    {id: uid(), name: 'Figma Pro', cost: 18000, cycle: 'monthly', renewal: addDays(now, 25), category: 'Software', notes: '', status: 'active', logo: 'figma'},
    {id: uid(), name: 'Domain name', cost: 12000, cycle: 'yearly', renewal: addDays(now, 90), category: 'Other', notes: 'personal website', status: 'active', logo: ''},
    {id: uid(), name: 'Udemy courses', cost: 21000, cycle: 'quarterly', renewal: addDays(now, 45), category: 'Education', notes: '', status: 'paused', logo: 'udemy'},
  ];

  // Budgets
  state.budgets = {
    'Food': 80000,
    'Transportation': 40000,
    'Entertainment': 20000,
    'Shopping': 30000,
    'Utilities': 30000,
    'Education': 50000,
  };
  state.budgetIcons = {};

  // Goals
  state.goals = [
    {id: uid(), name: 'Emergency Fund', target: 1000000, current: 450000, date: addDays(now, 120), priority: 'high', icon: 'Shield', contributions: [{date: d(1), time: '09:30 AM', timestamp: new Date(y, m, 1, 9, 30).toISOString(), amount: 50000, sourceType: 'account', sourceId: gt, sourceName: 'GTBank'},{date: d(15), time: '02:15 PM', timestamp: new Date(y, m, 15, 14, 15).toISOString(), amount: 100000, sourceType: 'account', sourceId: ac, sourceName: 'Access Bank'},{date: d(25), time: '11:00 AM', timestamp: new Date(y, m, 25, 11, 0).toISOString(), amount: 200000, sourceType: 'custom', sourceName: 'Cash savings'}]},
    {id: uid(), name: 'Vacation Fund', target: 500000, current: 180000, date: addDays(now, 75), priority: 'medium', icon: 'Sun', contributions: [{date: d(5), time: '08:45 AM', timestamp: new Date(y, m, 5, 8, 45).toISOString(), amount: 80000, sourceType: 'account', sourceId: op, sourceName: 'Opay'},{date: d(20), time: '03:30 PM', timestamp: new Date(y, m, 20, 15, 30).toISOString(), amount: 100000, sourceType: 'custom', sourceName: 'Freelance payout'}]},
    {id: uid(), name: 'New Laptop', target: 800000, current: 320000, date: addDays(now, 150), priority: 'medium', icon: 'Monitor', contributions: [{date: d(10), time: '10:00 AM', timestamp: new Date(y, m, 10, 10, 0).toISOString(), amount: 120000, sourceType: 'account', sourceId: ac, sourceName: 'Access Bank'},{date: d(18), time: '01:20 PM', timestamp: new Date(y, m, 18, 13, 20).toISOString(), amount: 200000, sourceType: 'account', sourceId: gt, sourceName: 'GTBank'}]},
    {id: uid(), name: 'Investment Capital', target: 2000000, current: 750000, date: addDays(now, 200), priority: 'low', icon: 'Investment', contributions: [{date: d(1), time: '07:15 AM', timestamp: new Date(y, m, 1, 7, 15).toISOString(), amount: 200000, sourceType: 'custom', sourceName: 'Business profit'},{date: d(12), time: '05:45 PM', timestamp: new Date(y, m, 12, 17, 45).toISOString(), amount: 300000, sourceType: 'account', sourceId: gt, sourceName: 'GTBank'},{date: d(22), time: '09:00 AM', timestamp: new Date(y, m, 22, 9, 0).toISOString(), amount: 250000, sourceType: 'custom', sourceName: 'Dividend payment'}]},
  ];

  // Auto-categorization rules (seed examples)
  state.autoRules = [
    { keywords: ['uber','bolt','taxi','ride'], type: 'expense', category: 'Transportation' },
    { keywords: ['shoprite','market','groceries','supermarket','foodstuff'], type: 'expense', category: 'Food' },
    { keywords: ['salary','payroll'], type: 'income', category: 'Salary' },
    { keywords: ['freelance','client','project','design'], type: 'income', category: 'Freelance' },
    { keywords: ['church','offering','tithe','donation','charity'], type: 'giving', category: 'Church' },
    { keywords: ['transfer to savings','move to savings'], type: 'transfer', category: 'Bank to Savings' },
    { keywords: ['data','airtime','mtn','glo','airtel','9mobile'], type: 'expense', category: 'Internet' },
  ];

  // Compute total balance from accounts so everything stays consistent
  state.balance = state.accounts.reduce((s, a) => s + (a.balance || 0), 0);

  // Recurring income events
  const now0 = new Date();
  state.incomeEvents = [
    { id: uid(), name: 'Monthly Salary', amount: 650000, frequency: 'monthly', nextDate: addDays(now0, 29), category: 'Salary', syncToGcal: false, gcalEventId: null, active: true },
    { id: uid(), name: 'Freelance Retainer', amount: 80000, frequency: 'monthly', nextDate: addDays(now0, 12), category: 'Freelance', syncToGcal: false, gcalEventId: null, active: true }
  ];

  // Financial events derived from subscriptions, income events, and goals
  state.financialEvents = generateFinancialEvents();
  saveData();
}

function uid() { return Date.now().toString(36) + Math.random().toString(36).substr(2, 5); }

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

// ============ HELPERS ============
function fmt(n) {
  const symbol = (state.profile && state.profile.currency) || '₦';
  return symbol + Math.round(n).toLocaleString('en-US');
}

function fmtDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function monthKey(dateStr) {
  const d = new Date(dateStr);
  return d.getFullYear() + '-' + d.getMonth();
}

function monthLabel(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

function currentMonthKey() {
  const d = new Date();
  return d.getFullYear() + '-' + d.getMonth();
}

function daysUntil(dateStr) {
  const target = new Date(dateStr);
  const now = new Date();
  now.setHours(0,0,0,0);
  return Math.ceil((target - now) / (1000 * 60 * 60 * 24));
}

// ============ ACCOUNT HELPERS ============
function getAccountName(accountId) {
  if (!accountId) return '—';
  const acct = state.accounts.find(a => a.id === accountId);
  return acct ? acct.name : '—';
}

function populateAccountSelect(selectId, includeAllOption) {
  const select = document.getElementById(selectId);
  if (!select) return;
  const current = select.value;
  let html = includeAllOption ? '<option value="">All accounts</option>' : '';
  state.accounts.forEach(a => {
    html += '<option value="' + a.id + '">' + a.name + '</option>';
  });
  select.innerHTML = html;
  if (current) select.value = current;
}

function backToAccounts() {
  navigate('accounts');
}

// ============ COMPUTATIONS ============
function getMonthTransactions(monthK) {
  return state.transactions.filter(t => monthKey(t.date) === monthK);
}

function getAccountTransactions(accountId) {
  return state.transactions.filter(t => t.accountId === accountId || (t.type === 'transfer' && (t.fromAccountId === accountId || t.toAccountId === accountId)));
}

function getAccountMonthIncome(accountId, monthK) {
  return getMonthTransactions(monthK).filter(t => (t.type === 'income' && t.accountId === accountId) || (t.type === 'transfer' && t.toAccountId === accountId)).reduce((s, t) => s + t.amount, 0);
}

function getAccountMonthExpenses(accountId, monthK) {
  return getMonthTransactions(monthK).filter(t => t.type === 'expense' && t.accountId === accountId).reduce((s, t) => s + t.amount, 0);
}

function getAccountMonthGiving(accountId, monthK) {
  return getMonthTransactions(monthK).filter(t => t.type === 'giving' && t.accountId === accountId).reduce((s, t) => s + t.amount, 0);
}

function getAccountMonthTransfersOut(accountId, monthK) {
  return getMonthTransactions(monthK).filter(t => t.type === 'transfer' && (t.fromAccountId === accountId || (t.accountId === accountId && !t.fromAccountId))).reduce((s, t) => s + t.amount, 0);
}

function getIncomeTotal(monthK) {
  return getMonthTransactions(monthK).filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
}

function getExpenseTotal(monthK) {
  return getMonthTransactions(monthK).filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
}

function getGivingTotal(monthK) {
  return getMonthTransactions(monthK).filter(t => t.type === 'giving').reduce((s, t) => s + t.amount, 0);
}

function getSavings(monthK) {
  return getIncomeTotal(monthK) - getExpenseTotal(monthK);
}

function getCategoryTotals(monthK, type) {
  const txs = getMonthTransactions(monthK).filter(t => t.type === type);
  const cats = {};
  txs.forEach(t => { cats[t.category] = (cats[t.category] || 0) + t.amount; });
  return cats;
}

function getMonthlySavingsRate(monthK) {
  const inc = getIncomeTotal(monthK);
  if (inc === 0) return 0;
  return Math.round((getSavings(monthK) / inc) * 100);
}

function getLastNMonthKeys(n) {
  const keys = [];
  const now = new Date();
  for (let i = 0; i < n; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    keys.push(d.getFullYear() + '-' + d.getMonth());
  }
  return keys.reverse();
}

function getMonthLabelFromKey(key) {
  const [y, m] = key.split('-').map(Number);
  return new Date(y, m, 1).toLocaleDateString('en-US', { month: 'short' });
}

// ============ NAVIGATION ============
const pageTitles = {
  dashboard: { title: 'Dashboard', sub: 'Your financial command center' },
  transactions: { title: 'Transactions', sub: 'Every money movement, recorded' },
  income: { title: 'Income', sub: 'Track and analyze all income sources' },
  expenses: { title: 'Expenses', sub: 'Where your money goes' },
  subscriptions: { title: 'Subscriptions', sub: 'Track recurring expenses' },
  giving: { title: 'Giving', sub: 'Money given to others' },
  accounts: { title: 'Accounts', sub: 'Your bank and financial accounts' },
  'account-detail': { title: 'Account', sub: 'Transactions & details' },
  budgets: { title: 'Budgets', sub: 'Set limits, track progress' },
  goals: { title: 'Savings goals', sub: 'Track financial goals' },
  analytics: { title: 'Analytics', sub: 'Visual financial insights' },
  insights: { title: 'Insights', sub: 'Your financial performance' },
  reports: { title: 'Reports', sub: 'Generate financial summaries' },
  calendar: { title: 'Financial calendar', sub: 'Manage your transactions, events and reminders' },
  settings: { title: 'Settings', sub: 'Google Calendar and preferences' }
};

function toggleNavGroup(header) {
  const group = header.closest('.nav-group');
  group.classList.toggle('expanded');
}

function expandGroupForPage(page) {
  const groupMap = {
    transactions: 'moneyflow', income: 'moneyflow', expenses: 'moneyflow', giving: 'moneyflow',
    subscriptions: 'planning', budgets: 'planning', goals: 'planning', calendar: 'planning',
    analytics: 'analytics', reports: 'analytics', insights: 'analytics'
  };
  const groupName = groupMap[page];
  if (groupName) {
    document.querySelectorAll('.nav-group').forEach(g => {
      if (g.dataset.group === groupName) g.classList.add('expanded');
    });
  }
}

function navigate(page) {
  if (page === 'insights') page = 'analytics';
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const pageEl = document.getElementById('page-' + page);
  if (pageEl) pageEl.classList.add('active');
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.querySelectorAll(`[data-page="${page}"]`).forEach(n => n.classList.add('active'));
  if (page === 'analytics') document.querySelectorAll('[data-page="insights"]').forEach(n => n.classList.add('active'));
  expandGroupForPage(page);
  const titleInfo = pageTitles[page === 'analytics' ? 'analytics' : page] || { title: page.charAt(0).toUpperCase() + page.slice(1), sub: '' };
  document.getElementById('pageTitle').textContent = titleInfo.title;
  document.getElementById('pageSubtitle').textContent = titleInfo.sub;

  if (page === 'dashboard') renderDashboard();
  if (page === 'transactions') renderTransactions();
  if (page === 'income') renderIncome();
  if (page === 'expenses') renderExpenses();
  if (page === 'subscriptions') renderSubscriptions();
  if (page === 'giving') renderGiving();
  if (page === 'accounts') renderAccounts();
  if (page === 'account-detail') renderAccountDetail();
  if (page === 'budgets') renderBudgets();
  if (page === 'goals') renderGoals();
  if (page === 'analytics') renderAnalytics();
  if (page === 'reports') renderReports();
  if (page === 'calendar') renderCalendar();
  if (page === 'settings') renderSettings();
}

document.querySelectorAll('[data-page]').forEach(el => {
  el.addEventListener('click', () => navigate(el.dataset.page));
});

// ============ CHART MANAGEMENT ============
const charts = {};

function destroyChart(id) {
  if (charts[id]) { charts[id].destroy(); delete charts[id]; }
}

const chartColors = {
  primary: '#397968',
  secondary: '#AEEF33',
  income: '#397968',
  expense: '#D95C5C',
  giving: '#D95C5C',
  savings: '#AEEF33',
  transfer: '#9AA39F',
  palette: ['#397968','#AEEF33','#5FA38B','#8BCC63','#D95C5C','#9AA39F','#C8E6C0','#B4D8CC','#E2A33D','#638B20']
};

function getThemeColor(varName) {
  const styles = getComputedStyle(document.documentElement);
  const val = styles.getPropertyValue(varName).trim();
  return val || '#69736F';
}

function getChartGridColor() { return getThemeColor('--chart-grid'); }
function getChartTextColor() { return getThemeColor('--chart-text'); }
function getChartLegendColor() { return getThemeColor('--text-secondary'); }

const chartDefaults = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: '#397968',
      titleColor: '#FFF',
      bodyColor: '#FFF',
      padding: 12,
      cornerRadius: 8,
      displayColors: true,
      boxPadding: 4,
      callbacks: {
        title: (items) => items[0].label,
        label: (ctx) => {
          const val = ctx.parsed.y !== undefined ? ctx.parsed.y : ctx.parsed;
          const total = ctx.dataset.data.reduce((a,b) => a+b, 0);
          const pct = total > 0 ? Math.round((val / total) * 100) : 0;
          const label = ctx.dataset.label || ctx.label || '';
          if (ctx.chart.config.type === 'doughnut') {
            const dTotal = ctx.dataset.data.reduce((a,b) => a+b, 0);
            const dPct = dTotal > 0 ? Math.round((val / dTotal) * 100) : 0;
            return ctx.label + ': ' + fmt(val) + ' (' + dPct + '%)';
          }
          if (pct > 0 && ctx.chart.config.type === 'bar') {
            return label + ': ' + fmt(val) + ' (' + pct + '% of total)';
          }
          return (label ? label + ': ' : '') + fmt(val);
        }
      }
    }
  },
  scales: {
    x: { grid: { display: false }, ticks: { color: getChartTextColor(), font: { size: 11 } }, border: { display: false } },
    y: { grid: { color: getChartGridColor() }, ticks: { color: getChartTextColor(), font: { size: 11 }, callback: (v) => '\u20a6' + (v >= 1000 ? (v/1000).toFixed(0) + 'k' : v) }, border: { display: false } }
  }
};

function refreshChartColors() {
  chartDefaults.plugins.tooltip.backgroundColor = getThemeColor('--accent');
  chartDefaults.scales.x.ticks.color = getChartTextColor();
  chartDefaults.scales.y.ticks.color = getChartTextColor();
  chartDefaults.scales.y.grid.color = getChartGridColor();

  chartColors.primary = getThemeColor('--accent');
  chartColors.income = getThemeColor('--success');
  chartColors.expense = getThemeColor('--danger');
  chartColors.giving = getThemeColor('--danger');
  chartColors.savings = getThemeColor('--lime');
  chartColors.transfer = getThemeColor('--text-tertiary');
  chartColors.secondary = getThemeColor('--lime');
  chartColors.palette = [
    getThemeColor('--accent'),
    getThemeColor('--lime'),
    getThemeColor('--success'),
    '#8BCC63',
    getThemeColor('--danger'),
    getThemeColor('--text-tertiary'),
    getThemeColor('--success-bg'),
    getThemeColor('--border-strong'),
    getThemeColor('--warning'),
    getThemeColor('--lime')
  ];
}

// ============ ACCOUNTS ============
let editingAccountId = null;
let viewingAccountId = null;

const subscriptionLogos = {
  spotify: 'https://upload.wikimedia.org/wikipedia/commons/1/19/Spotify_logo_without_text.svg',
  netflix: 'https://upload.wikimedia.org/wikipedia/commons/0/08/Netflix_2015_logo.svg',
  chatgpt: 'https://upload.wikimedia.org/wikipedia/commons/0/04/ChatGPT_logo.svg',
  youtube: 'https://upload.wikimedia.org/wikipedia/commons/0/09/YouTube_full-color_icon_%282017%29.svg',
  figma: 'https://upload.wikimedia.org/wikipedia/commons/3/33/Figma-logo.svg',
  udemy: 'https://upload.wikimedia.org/wikipedia/commons/e/e3/Udemy_logo.svg',
  google: 'https://upload.wikimedia.org/wikipedia/commons/5/53/Google_%22G%22_Logo.svg',
  microsoft: 'https://upload.wikimedia.org/wikipedia/commons/4/44/Microsoft_logo.svg',
  adobe: 'https://upload.wikimedia.org/wikipedia/commons/6/6e/Adobe_Corporate_logo.svg',
  apple: 'https://upload.wikimedia.org/wikipedia/commons/f/fa/Apple_logo_black.svg',
  amazon: 'https://upload.wikimedia.org/wikipedia/commons/a/a9/Amazon_logo.svg',
  dropbox: 'https://upload.wikimedia.org/wikipedia/commons/7/78/Dropbox_Icon.svg',
  notion: 'https://upload.wikimedia.org/wikipedia/commons/4/45/Notion_app_logo.png',
  slack: 'https://upload.wikimedia.org/wikipedia/commons/d/d5/Slack_icon_2019.svg',
  zoom: 'https://upload.wikimedia.org/wikipedia/commons/7/7b/Zoom_Communications_Logo.svg',
  discord: 'https://upload.wikimedia.org/wikipedia/commons/3/3f/Discord_logo.svg',
  twitter: 'https://upload.wikimedia.org/wikipedia/commons/6/6f/Logo_of_Twitter.svg',
  linkedin: 'https://upload.wikimedia.org/wikipedia/commons/c/ca/LinkedIn_logo_initials.png',
};

function getSubscriptionLogoHtml(sub) {
  if (sub.logo && sub.logo.startsWith('data:')) {
    return '<img src="' + sub.logo + '" style="width:36px;height:36px;border-radius:10px;object-fit:cover;" alt="">';
  }
  if (sub.logo && subscriptionLogos[sub.logo]) {
    return '<img src="' + subscriptionLogos[sub.logo] + '" style="width:36px;height:36px;border-radius:10px;object-fit:contain;background:var(--card);padding:2px;" alt="">';
  }
  const icon = categoryIcons[sub.category] || categoryIcons['Subscriptions'];
  return '<div class="sub-icon" style="background:var(--light-green);color:var(--accent);">' + icon + '</div>';
}

function renderSubLogoSelector() {
  const container = document.getElementById('subLogoSelector');
  if (!container) return;
  let html = '<div class="onb-chip" data-logo="" onclick="selectSubLogo(this)" style="padding:4px 8px;">None</div>';
  Object.entries(subscriptionLogos).forEach(([key, url]) => {
    html += '<div class="onb-chip" data-logo="' + key + '" onclick="selectSubLogo(this)" style="padding:4px 8px;display:inline-flex;align-items:center;gap:6px;"><img src="' + url + '" style="width:18px;height:18px;object-fit:contain;" alt=""> ' + key.charAt(0).toUpperCase() + key.slice(1) + '</div>';
  });
  container.innerHTML = html;
}

let selectedSubLogo = '';
function selectSubLogo(chip) {
  document.querySelectorAll('#subLogoSelector .onb-chip').forEach(c => c.classList.remove('selected'));
  chip.classList.add('selected');
  selectedSubLogo = chip.dataset.logo;
  document.getElementById('subLogoPreview').style.display = selectedSubLogo && subscriptionLogos[selectedSubLogo] ? 'block' : 'none';
  const img = document.getElementById('subLogoPreviewImg');
  if (img && subscriptionLogos[selectedSubLogo]) img.src = subscriptionLogos[selectedSubLogo];
}

function handleSubLogoUpload(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    selectedSubLogo = e.target.result;
    document.getElementById('subLogoPreview').style.display = 'block';
    document.getElementById('subLogoPreviewImg').src = e.target.result;
    document.querySelectorAll('#subLogoSelector .onb-chip').forEach(c => c.classList.remove('selected'));
  };
  reader.readAsDataURL(file);
}

function renderAccounts() {
  const container = document.getElementById('accountList');
  const totalBalance = state.accounts.reduce((s, a) => s + (a.balance || 0), 0);
  document.getElementById('acctTotalCount').textContent = state.accounts.length;
  document.getElementById('acctTotalBalance').textContent = fmt(totalBalance);
  document.getElementById('acctActiveCount').textContent = state.accounts.length;

  if (state.accounts.length === 0) {
    container.innerHTML = '<div class="empty-state">No accounts yet. Click "Add account" to get started.</div>';
    return;
  }

  container.innerHTML = state.accounts.map(a => {
    const txs = getAccountTransactions(a.id);
    const mk = currentMonthKey();
    const inc = getAccountMonthIncome(a.id, mk);
    const exp = getAccountMonthExpenses(a.id, mk) + getAccountMonthGiving(a.id, mk) + getAccountMonthTransfersOut(a.id, mk);
    return `<div class="budget-card" style="cursor:pointer;" onclick="viewAccount('${a.id}')">
      <div class="budget-card-icon" style="background:var(--light-green);color:var(--accent);">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2"/><path d="M6 12h.01M18 12h.01"/></svg>
      </div>
      <div class="budget-card-body">
        <div class="budget-card-top">
          <div>
            <div class="budget-card-name">${a.name}</div>
            <div style="font-size:12px;color:var(--text-tertiary);margin-top:2px;">${txs.length} transactions · ${fmt(inc)} in · ${fmt(exp)} out</div>
          </div>
          <div style="text-align:right;">
            <div style="font-size:18px;font-weight:700;">${fmt(a.balance || 0)}</div>
          </div>
        </div>
      </div>
      <div class="tx-actions" style="opacity:1;" onclick="event.stopPropagation();">
        <button class="tx-action-btn" onclick="editAccount('${a.id}')">${iconEdit}</button>
        <button class="tx-action-btn" onclick="deleteAccount('${a.id}')">${iconDelete}</button>
      </div>
    </div>`;
  }).join('');
}

function viewAccount(id) {
  viewingAccountId = id;
  navigate('account-detail');
}

function renderAccountDetail() {
  if (!viewingAccountId) return;
  const acct = state.accounts.find(a => a.id === viewingAccountId);
  if (!acct) return;
  const mk = currentMonthKey();
  const txs = getAccountTransactions(acct.id).sort((a,b) => new Date(b.date) - new Date(a.date));
  const inc = txs.filter(t => t.type === 'income' && monthKey(t.date) === mk).reduce((s,t) => s + t.amount, 0)
                + txs.filter(t => t.type === 'transfer' && t.toAccountId === acct.id && monthKey(t.date) === mk).reduce((s,t) => s + t.amount, 0);
  const out = txs.filter(t => (t.type === 'expense' || t.type === 'giving') && monthKey(t.date) === mk).reduce((s,t) => s + t.amount, 0)
                + txs.filter(t => t.type === 'transfer' && (t.fromAccountId === acct.id || (t.accountId === acct.id && !t.fromAccountId)) && monthKey(t.date) === mk).reduce((s,t) => s + t.amount, 0);

  document.getElementById('acctDetailTitle').textContent = acct.name + ' — Transactions';
  document.getElementById('acctDetailBalance').textContent = fmt(acct.balance || 0);
  document.getElementById('acctDetailIncome').textContent = fmt(inc);
  document.getElementById('acctDetailExpenses').textContent = fmt(out);
  document.getElementById('acctDetailTxCount').textContent = txs.length;

  const container = document.getElementById('acctDetailTxList');
  if (txs.length === 0) {
    container.innerHTML = '<div class="empty-state">No transactions for this account</div>';
    return;
  }
  container.innerHTML = txs.map(renderTxRow).join('');
}

function openAccountModal() {
  editingAccountId = null;
  document.getElementById('accountModalTitle').textContent = 'Add account';
  document.getElementById('accountName').value = '';
  document.getElementById('accountBalance').value = '';
  document.getElementById('accountModalOverlay').classList.add('active');
}

function closeAccountModal() {
  document.getElementById('accountModalOverlay').classList.remove('active');
  editingAccountId = null;
}

function editAccount(id) {
  const acct = state.accounts.find(a => a.id === id);
  if (!acct) return;
  editingAccountId = id;
  document.getElementById('accountModalTitle').textContent = 'Edit account';
  document.getElementById('accountName').value = acct.name;
  document.getElementById('accountBalance').value = acct.balance || 0;
  document.getElementById('accountModalOverlay').classList.add('active');
}

function saveAccount() {
  const name = document.getElementById('accountName').value.trim();
  const balance = parseFloat(document.getElementById('accountBalance').value) || 0;
  if (!name) { showToast('Enter an account name'); return; }
  if (editingAccountId) {
    const idx = state.accounts.findIndex(a => a.id === editingAccountId);
    if (idx >= 0) {
      const oldAcct = state.accounts[idx];
      const diff = balance - (oldAcct.balance || 0);
      state.accounts[idx] = { ...oldAcct, name, balance };
      state.balance = (state.balance || 0) + diff;
    }
    showToast('Account updated');
  } else {
    state.accounts.push({ id: uid(), name, balance });
    state.balance = (state.balance || 0) + balance;
    showToast('Account added');
  }
  saveData();
  closeAccountModal();
  renderAccounts();
}

function deleteAccount(id) {
  const acct = state.accounts.find(a => a.id === id);
  if (!acct) return;
  const hasTx = state.transactions.some(t => t.accountId === id);
  const msg = hasTx
    ? 'Delete account "' + acct.name + '"? Transactions linked to this account will keep their records, but the account itself will be removed.'
    : 'Delete account "' + acct.name + '"?';
  confirmDelete('Delete account?', msg, () => {
    const removed = state.accounts.find(a => a.id === id);
    if (removed) state.balance = (state.balance || 0) - (removed.balance || 0);
    state.accounts = state.accounts.filter(a => a.id !== id);
    saveData();
    showToast('Account deleted');
    renderAccounts();
  });
}

// ============ DASHBOARD ZERO-STATE ============
function hasDashboardData() {
  return (state.accounts && state.accounts.length > 0) ||
    (state.transactions && state.transactions.length > 0) ||
    (state.subscriptions && state.subscriptions.length > 0) ||
    (state.budgets && Object.keys(state.budgets).length > 0) ||
    (state.goals && state.goals.length > 0) ||
    (state.financialEvents && state.financialEvents.length > 0) ||
    (state.incomeEvents && state.incomeEvents.length > 0);
}

function updateDashEmpty() {
  const banner = document.getElementById('dashEmpty');
  if (!banner) return;
  if (state.dashEmptyDismissed || hasDashboardData()) {
    banner.style.display = 'none';
  } else {
    banner.style.display = 'flex';
  }
}

function dismissDashEmpty() {
  state.dashEmptyDismissed = true;
  saveData();
  const banner = document.getElementById('dashEmpty');
  if (banner) banner.style.display = 'none';
  showToast('Got it! Ready when you are.');
}

// ============ DASHBOARD ============
function renderDashboard() {
  const mk = currentMonthKey();
  const income = getIncomeTotal(mk);
  const expenses = getExpenseTotal(mk);
  const savings = income - expenses;
  const savingsRate = income > 0 ? Math.round((savings / income) * 100) : 0;
  const balance = state.accounts.reduce((s, a) => s + (a.balance || 0), 0);

  document.getElementById('dashIncome').textContent = fmt(income);
  document.getElementById('dashExpenses').textContent = fmt(expenses);
  document.getElementById('dashSavings').textContent = fmt(savings);
  document.getElementById('dashSavingsRate').textContent = savingsRate + '% savings rate';
  document.getElementById('dashBalance').textContent = fmt(balance);

  const lastMk = getLastNMonthKeys(2)[0];
  const lastIncome = getIncomeTotal(lastMk);
  const lastExpenses = getExpenseTotal(lastMk);
  document.getElementById('dashIncomeSub').textContent = lastIncome > 0 ? (income > lastIncome ? '↑ ' : '↓ ') + fmt(Math.abs(income - lastIncome)) + ' vs last month' : '—';
  document.getElementById('dashExpensesSub').textContent = lastExpenses > 0 ? (expenses > lastExpenses ? '↑ ' : '↓ ') + fmt(Math.abs(expenses - lastExpenses)) + ' vs last month' : '—';

  renderDashboardHealthScore();
  renderDashboardCharts();
  renderDashboardBudgets();
  renderDashboardRenewals();
  renderDashboardRecent();
  renderAIInsights();
  renderDashboardUpcoming();
  renderDashboardNotifications();
  applyDashboardLayout();
  updateDashEmpty();
}

// ============ DASHBOARD WIDGET CUSTOMIZATION ============
const DASH_WIDGETS = [
  { id: 'metrics', label: 'Summary cards', span: 4 },
  { id: 'health', label: 'Financial health score', span: 1 },
  { id: 'incomeExpense', label: 'Income vs expenses', span: 1 },
  { id: 'topCategories', label: 'Top spending categories', span: 1 },
  { id: 'budgets', label: 'Budget progress', span: 1 },
  { id: 'renewals', label: 'Upcoming renewals', span: 1 },
  { id: 'recent', label: 'Recent transactions', span: 1 },
  { id: 'insights', label: 'AI insights', span: 1 },
  { id: 'upcoming', label: 'Upcoming financial events', span: 1 }
];

function getDashLayout() {
  const cfg = state.dashboardLayout || {};
  const order = (cfg.order || DASH_WIDGETS.map(w => w.id)).filter(id => DASH_WIDGETS.some(w => w.id === id));
  const hidden = cfg.hidden || [];
  // Ensure all widget ids are present in order
  DASH_WIDGETS.forEach(w => { if (!order.includes(w.id)) order.push(w.id); });
  return { order, hidden: hidden.filter(id => DASH_WIDGETS.some(w => w.id === id)) };
}

function applyDashboardLayout() {
  const grid = document.getElementById('dashGrid');
  if (!grid) return;
  const { order, hidden } = getDashLayout();

  // Hide widget elements per saved state
  document.querySelectorAll('#dashGrid .dash-widget').forEach(el => {
    const id = el.getAttribute('data-widget');
    el.style.display = hidden.includes(id) ? 'none' : '';
  });

  // Reorder widgets by appending them in saved order
  const widgets = document.querySelectorAll('#dashGrid .dash-widget');
  const widgetMap = {};
  widgets.forEach(el => widgetMap[el.getAttribute('data-widget')] = el);

  // Detach all, then re-append in order
  widgets.forEach(el => el.remove());
  order.forEach(id => {
    if (widgetMap[id]) grid.appendChild(widgetMap[id]);
  });
}

function saveDashLayout() {
  const grid = document.getElementById('dashGrid');
  if (!grid) return;
  const order = [];
  grid.querySelectorAll('.dash-widget').forEach(el => order.push(el.getAttribute('data-widget')));
  // Preserve hidden state from existing layout
  const existing = state.dashboardLayout && state.dashboardLayout.hidden ? state.dashboardLayout.hidden : [];
  const hidden = existing.filter(id => DASH_WIDGETS.some(w => w.id === id));
  state.dashboardLayout = { order, hidden };
  saveData();
}

function toggleDashCustomize() {
  const page = document.getElementById('page-dashboard');
  const customizeBtn = document.getElementById('dashCustomizeBtn');
  const hint = document.getElementById('dashSortHint');
  const hintText = document.getElementById('dashSortHintText');

  const isActive = page.classList.contains('dash-customize-active');
  if (isActive) {
    page.classList.remove('dash-customize-active');
    saveDashLayout();
    if (customizeBtn) customizeBtn.style.display = '';
    hint.style.display = 'none';
    // Clean up drag state
    document.querySelectorAll('.dash-widget').forEach(el => {
      el.setAttribute('draggable', 'false');
      el.classList.remove('dragging', 'drag-over', 'is-hidden-widget');
      el.removeEventListener('dragstart', handleDashDragStart);
      el.removeEventListener('dragover', handleDashDragOver);
      el.removeEventListener('dragleave', handleDashDragLeave);
      el.removeEventListener('drop', handleDashDrop);
      el.removeEventListener('dragend', handleDashDragEnd);
      const eye = el.querySelector('.dash-widget-hide');
      if (eye) eye.remove();
    });
    // Re-render to restore normal layout
    applyDashboardLayout();
    // Re-render charts to fill any newly-shown containers
    renderDashboardCharts();
  } else {
    page.classList.add('dash-customize-active');
    hint.style.display = 'flex';
    hintText.textContent = 'Drag widgets to reorder. Use the eye button to show/hide widgets.';
    // Show all widgets when customizing
    const { hidden } = getDashLayout();
    document.querySelectorAll('#dashGrid .dash-widget').forEach(el => {
      el.style.display = '';
      const id = el.getAttribute('data-widget');
      if (hidden.includes(id)) el.classList.add('is-hidden-widget');
    });
    const btn = document.getElementById('dashCustomizeBtn');
    if (btn) btn.style.display = 'none';
    initDashDrag();
  }
}

function resetDashLayout() {
  state.dashboardLayout = { order: DASH_WIDGETS.map(w => w.id), hidden: [] };
  saveData();
  applyDashboardLayout();
  // If in customize mode, re-init to update icons
  const page = document.getElementById('page-dashboard');
  if (page && page.classList.contains('dash-customize-active')) {
    document.querySelectorAll('#dashGrid .dash-widget').forEach(el => el.style.display = '');
    initDashDrag();
  }
}

function initDashDrag() {
  const grid = document.getElementById('dashGrid');
  if (!grid) return;

  // Remove any existing drag listeners
  document.querySelectorAll('.dash-widget').forEach(el => {
    el.removeEventListener('dragstart', handleDashDragStart);
    el.removeEventListener('dragover', handleDashDragOver);
    el.removeEventListener('dragleave', handleDashDragLeave);
    el.removeEventListener('drop', handleDashDrop);
    el.removeEventListener('dragend', handleDashDragEnd);

    // Remove existing eye buttons
    const oldEye = el.querySelector('.dash-widget-hide');
    if (oldEye) oldEye.remove();
  });

  document.querySelectorAll('.dash-widget').forEach(el => {
    el.setAttribute('draggable', 'true');
    el.addEventListener('dragstart', handleDashDragStart);
    el.addEventListener('dragover', handleDashDragOver);
    el.addEventListener('dragleave', handleDashDragLeave);
    el.addEventListener('drop', handleDashDrop);
    el.addEventListener('dragend', handleDashDragEnd);

    // Add hide (eye) toggle button
    const widgetId = el.getAttribute('data-widget');
    const eyeBtn = document.createElement('button');
    eyeBtn.className = 'dash-widget-hide';
    const { hidden: curHidden } = getDashLayout();
    const isHidden = curHidden.includes(widgetId);
    eyeBtn.title = isHidden ? 'Show widget' : 'Hide widget';
    updateEyeBtnIcon(eyeBtn, isHidden);
    eyeBtn.addEventListener('click', (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      hideDashWidget(widgetId);
    });
    el.appendChild(eyeBtn);
  });
}

function updateEyeBtnIcon(eyeBtn, isHidden) {
  if (isHidden) {
    eyeBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
  } else {
    eyeBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>';
  }
}

function hideDashWidget(widgetId) {
  const { order, hidden } = getDashLayout();
  const el = document.querySelector('#dashGrid .dash-widget[data-widget="' + widgetId + '"]');
  const eyeBtn = el ? el.querySelector('.dash-widget-hide') : null;

  if (hidden.includes(widgetId)) {
    // Un-hide
    state.dashboardLayout = { order, hidden: hidden.filter(id => id !== widgetId) };
    if (el) {
      el.classList.remove('is-hidden-widget');
      el.style.display = '';
      if (eyeBtn) { eyeBtn.title = 'Hide widget'; updateEyeBtnIcon(eyeBtn, false); }
    }
  } else {
    // Hide
    state.dashboardLayout = { order, hidden: [...hidden, widgetId] };
    if (el) {
      el.classList.add('is-hidden-widget');
      el.style.display = '';
      if (eyeBtn) { eyeBtn.title = 'Show widget'; updateEyeBtnIcon(eyeBtn, true); }
    }
  }
  saveData();
}

function showDashWidget(widgetId) {
  const { order, hidden } = getDashLayout();
  state.dashboardLayout = { order, hidden: hidden.filter(id => id !== widgetId) };
  saveData();
  const el = document.querySelector('#dashGrid .dash-widget[data-widget="' + widgetId + '"]');
  if (el) el.style.display = '';
  initDashDrag();
}

let dashDragSource = null;

function handleDashDragStart(e) {
  dashDragSource = this;
  this.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', this.getAttribute('data-widget'));
}

function handleDashDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  if (this !== dashDragSource) this.classList.add('drag-over');
}

function handleDashDragLeave(e) {
  this.classList.remove('drag-over');
}

function handleDashDrop(e) {
  e.preventDefault();
  this.classList.remove('drag-over');
  if (dashDragSource && this !== dashDragSource) {
    const grid = document.getElementById('dashGrid');
    const widgets = Array.from(grid.querySelectorAll('.dash-widget'));
    const sourceIndex = widgets.indexOf(dashDragSource);
    const targetIndex = widgets.indexOf(this);
    if (sourceIndex < targetIndex) {
      this.after(dashDragSource);
    } else {
      this.before(dashDragSource);
    }
  }
}

function handleDashDragEnd() {
  this.classList.remove('dragging');
  dashDragSource = null;
  document.querySelectorAll('.dash-widget').forEach(el => el.classList.remove('drag-over'));
}

function renderDashboardHealthScore() {
  const mk = currentMonthKey();
  const score = calculateHealthScore(mk);
  const container = document.getElementById('dashHealthScore');
  if (!container) return;
  const color = score >= 70 ? 'var(--success)' : score >= 40 ? 'var(--warning)' : 'var(--danger)';
  const label = score >= 70 ? 'Healthy' : score >= 40 ? 'Fair' : 'Needs attention';
  const income = getIncomeTotal(mk);
  const expenses = getExpenseTotal(mk);
  const savings = income - expenses;
  const savingsRate = income > 0 ? Math.round((savings / income) * 100) : 0;
  const budgets = Object.entries(state.budgets);
  let adhered = 0;
  budgets.forEach(([cat, limit]) => {
    const spent = getMonthTransactions(mk).filter(t => t.type === 'expense' && t.category === cat).reduce((s, t) => s + t.amount, 0);
    if (spent <= limit) adhered++;
  });
  const budgetPct = budgets.length > 0 ? Math.round((adhered / budgets.length) * 100) : 100;
  const incomeCats = getCategoryTotals(mk, 'income');
  const incomeSources = Object.keys(incomeCats).length;
  const circumference = 2 * Math.PI * 52;
  const dashOffset = circumference - (score / 100) * circumference;
  container.innerHTML = '<div style="display:flex;align-items:center;gap:24px;"><div style="position:relative;width:120px;height:120px;flex-shrink:0;"><svg width="120" height="120" viewBox="0 0 120 120" style="transform:rotate(-90deg);"><circle cx="60" cy="60" r="52" fill="none" style="stroke:var(--border-secondary);" stroke-width="8"/><circle cx="60" cy="60" r="52" fill="none" style="stroke:' + color + ';" stroke-width="8" stroke-linecap="round" stroke-dasharray="' + circumference + '" stroke-dashoffset="' + dashOffset + '" style="transition:stroke-dashoffset 0.5s ease;"/></svg><div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;"><div style="font-size:32px;font-weight:700;color:' + color + ';letter-spacing:-1px;">' + score + '</div><div style="font-size:11px;color:var(--text-tertiary);">/ 100</div></div></div><div style="flex:1;"><div style="font-size:15px;font-weight:600;color:' + color + ';margin-bottom:12px;">' + label + '</div><div style="display:flex;flex-direction:column;gap:8px;"><div style="display:flex;align-items:center;gap:8px;"><div style="width:8px;height:8px;border-radius:50%;background:var(--success);"></div><span style="font-size:13px;color:var(--text-secondary);">Savings rate: <strong style="color:var(--text);font-weight:600;">' + savingsRate + '%</strong></span></div><div style="display:flex;align-items:center;gap:8px;"><div style="width:8px;height:8px;border-radius:50%;background:var(--accent);"></div><span style="font-size:13px;color:var(--text-secondary);">Budget adherence: <strong style="color:var(--text);font-weight:600;">' + budgetPct + '%</strong></span></div><div style="display:flex;align-items:center;gap:8px;"><div style="width:8px;height:8px;border-radius:50%;background:var(--lime);"></div><span style="font-size:13px;color:var(--text-secondary);">Income sources: <strong style="color:var(--text);font-weight:600;">' + incomeSources + '</strong></span></div></div></div></div>';
}

function renderDashboardCharts() {
  // Income vs Expense bar chart
  const months = getLastNMonthKeys(4);
  destroyChart('chartIncomeExpense');
  charts.chartIncomeExpense = new Chart(document.getElementById('chartIncomeExpense'), {
    type: 'bar',
    data: {
      labels: months.map(getMonthLabelFromKey),
      datasets: [
        { label: 'Income', data: months.map(m => getIncomeTotal(m)), backgroundColor: chartColors.income, borderRadius: 6, barPercentage: 0.6 },
        { label: 'Expenses', data: months.map(m => getExpenseTotal(m)), backgroundColor: chartColors.expense, borderRadius: 6, barPercentage: 0.6 }
      ]
    },
    options: { ...chartDefaults, plugins: { ...chartDefaults.plugins, legend: { display: true, position: 'bottom', labels: { color: getChartLegendColor(), font: { size: 12 }, boxWidth: 12, boxHeight: 12, padding: 16 } } } }
  });

  // Top categories doughnut
  const mk = currentMonthKey();
  const cats = getCategoryTotals(mk, 'expense');
  const sorted = Object.entries(cats).sort((a,b) => b[1] - a[1]).slice(0, 6);
  destroyChart('chartTopCategories');
  charts.chartTopCategories = new Chart(document.getElementById('chartTopCategories'), {
    type: 'doughnut',
    data: {
      labels: sorted.map(s => s[0]),
      datasets: [{ data: sorted.map(s => s[1]), backgroundColor: chartColors.palette, borderWidth: 0 }]
    },
    options: { ...chartDefaults, cutout: '65%', scales: {}, plugins: { ...chartDefaults.plugins, tooltip: { ...chartDefaults.plugins.tooltip, callbacks: { label: (ctx) => ctx.label + ': ' + fmt(ctx.parsed) } } } }
  });
}

function renderDashboardAccounts() {
  const container = document.getElementById('dashAccounts');
  if (state.accounts.length === 0) {
    container.innerHTML = '<div class="empty-state">No accounts yet. <button class="btn btn-sm" onclick="openAccountModal()">Add account</button></div>';
    return;
  }
  const mk = currentMonthKey();
  container.innerHTML = state.accounts.map(a => {
    const txs = getAccountTransactions(a.id);
    const inc = getAccountMonthIncome(a.id, mk);
    const exp = getAccountMonthExpenses(a.id, mk) + getAccountMonthGiving(a.id, mk) + getAccountMonthTransfersOut(a.id, mk);
    return `<div class="sub-item" style="cursor:pointer;" onclick="viewAccount('${a.id}')">
      <div class="sub-icon" style="background:var(--light-green);color:var(--accent);">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2"/><path d="M6 12h.01M18 12h.01"/></svg>
      </div>
      <div class="sub-info">
        <div class="sub-name">${a.name}</div>
        <div class="sub-meta">${txs.length} transactions · ${fmt(inc)} in · ${fmt(exp)} out</div>
      </div>
      <div style="text-align:right;">
        <div style="font-size:16px;font-weight:700;">${fmt(a.balance || 0)}</div>
      </div>
      <div class="tx-actions" style="opacity:1;" onclick="event.stopPropagation();">
        <button class="tx-action-btn" onclick="editAccount('${a.id}')">${iconEdit}</button>
        <button class="tx-action-btn" onclick="deleteAccount('${a.id}')">${iconDelete}</button>
      </div>
    </div>`;
  }).join('');
}

function renderDashboardBudgets() {
  const mk = currentMonthKey();
  const container = document.getElementById('dashBudgets');
  const budgets = Object.entries(state.budgets);
  if (budgets.length === 0) {
    container.innerHTML = '<div class="empty-state">No budgets set yet</div>';
    return;
  }

  // Check for at-risk budgets for alert banner
  let atRisk = [];
  budgets.forEach(([cat, limit]) => {
    const spent = getMonthTransactions(mk).filter(t => t.type === 'expense' && t.category === cat).reduce((s, t) => s + t.amount, 0);
    const pct = limit > 0 ? (spent / limit) * 100 : 0;
    if (spent > limit) atRisk.push({ cat, status: 'over', pct: Math.round(pct) });
    else if (pct >= 80) atRisk.push({ cat, status: 'warning', pct: Math.round(pct) });
  });

  let alertHtml = '';
  if (atRisk.length > 0) {
    const overBudgets = atRisk.filter(b => b.status === 'over');
    const warningBudgets = atRisk.filter(b => b.status === 'warning');
    if (overBudgets.length > 0) {
      alertHtml = `<div class="budget-alert-bar danger"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>Over budget: ${overBudgets.map(b => b.cat).join(', ')}</div>`;
    } else if (warningBudgets.length > 0) {
      alertHtml = `<div class="budget-alert-bar warning"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>Nearing limit: ${warningBudgets.map(b => b.cat + ' (' + b.pct + '%)').join(', ')}</div>`;
    }
  }

  container.innerHTML = alertHtml + budgets.map(([cat, limit]) => {
    const spent = getMonthTransactions(mk).filter(t => t.type === 'expense' && t.category === cat).reduce((s, t) => s + t.amount, 0);
    const pct = limit > 0 ? Math.min(100, (spent / limit) * 100) : 0;
    const over = spent > limit;
    const remaining = limit - spent;
    const color = over ? chartColors.expense : (pct >= 80 ? '#D99A3D' : chartColors.income);
    const icon = categoryIcons[state.budgetIcons[cat]] || categoryIcons[cat] || categoryIcons['Other'];
    const badgeText = over ? 'Over budget!' : (pct >= 80 ? Math.round(pct) + '% used' : Math.round(pct) + '%');
    return `<div style="padding:14px 0;border-bottom:1px solid var(--border);">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
        <div style="display:flex;align-items:center;gap:10px;">
          <div style="width:36px;height:36px;border-radius:9px;background:var(--light-green);display:flex;align-items:center;justify-content:center;color:var(--accent);">${icon}</div>
          <span style="font-size:14px;font-weight:600;">${cat}</span>
        </div>
        <span class="badge ${over ? 'badge-danger' : pct >= 80 ? 'badge-warning' : 'badge-success'}" style="font-size:12px;">${badgeText}</span>
      </div>
      <div class="progress-bar-lg"><div class="progress-fill-lg" style="width:${pct}%;background:${color};"></div></div>
      <div style="display:flex;justify-content:space-between;margin-top:8px;">
        <span style="font-size:13px;color:var(--text-secondary);"><strong style="color:var(--text);font-weight:600;">${fmt(spent)}</strong> spent</span>
        <span style="font-size:13px;color:${over ? 'var(--danger)' : 'var(--text-secondary)'}">${over ? fmt(Math.abs(remaining)) + ' over' : fmt(remaining) + ' left'}</span>
      </div>
    </div>`;
  }).join('');
}

function renderDashboardRenewals() {
  const container = document.getElementById('dashRenewals');
  const upcoming = [...state.subscriptions].sort((a,b) => new Date(a.renewal) - new Date(b.renewal)).slice(0, 4);
  if (upcoming.length === 0) {
    container.innerHTML = '<div class="empty-state">No subscriptions tracked</div>';
    return;
  }
  container.innerHTML = upcoming.map(s => {
    const days = daysUntil(s.renewal);
    const monthlyCost = s.cycle === 'monthly' ? s.cost : s.cycle === 'yearly' ? s.cost / 12 : s.cycle === 'quarterly' ? s.cost / 3 : s.cost / 4.3;
    let badge = '';
    if (days <= 3) badge = '<span class="badge badge-danger">Due soon</span>';
    else if (days <= 7) badge = '<span class="badge badge-warning">Soon</span>';
    else badge = '<span class="badge badge-gray">' + days + ' days</span>';
    return `<div class="sub-item">
      <div class="sub-icon">${categoryIcons[s.category] || categoryIcons['Subscriptions']}</div>
      <div class="sub-info">
        <div class="sub-name">${s.name}</div>
        <div class="sub-meta">${fmt(monthlyCost)}/mo · ${s.cycle}</div>
      </div>
      <div style="text-align:right;">
        <div class="sub-cost">${fmt(s.cost)}</div>
        <div style="margin-top:2px;">${badge}</div>
      </div>
    </div>`;
  }).join('');
}

function renderDashboardRecent() {
  const container = document.getElementById('dashRecent');
  const recent = [...state.transactions].sort((a,b) => new Date(b.date) - new Date(a.date)).slice(0, 6);
  container.innerHTML = recent.map(t => renderTxRow(t)).join('');
}

function renderTxRow(t) {
  const icon = categoryIcons[t.category] || categoryIcons['Other'];
  const isInflow = t.type === 'income';
  const isTransfer = t.type === 'transfer';
  const sign = isInflow ? '+' : (isTransfer ? '' : '−');
  const cls = t.type;
  let acctName = getAccountName(t.accountId);
  let metaLine = `${t.category} · ${fmtDate(t.date)} · ${t.payment}`;
  if (isTransfer) {
    const fromName = getAccountName(t.fromAccountId || t.accountId);
    const toName = getAccountName(t.toAccountId);
    metaLine = `${fromName} → ${toName} · ${fmtDate(t.date)}`;
    acctName = '';
  }
  const typeBadge = {
    income: '<span class="badge badge-success" style="font-size:10px;padding:2px 6px;">Income</span>',
    expense: '<span class="badge badge-gray" style="font-size:10px;padding:2px 6px;">Expense</span>',
    giving: '<span class="badge badge-gray" style="font-size:10px;padding:2px 6px;color:var(--danger);background:var(--danger-bg);">Giving</span>',
    transfer: '<span class="badge badge-gray" style="font-size:10px;padding:2px 6px;">Transfer</span>'
  };
  return `<div class="tx-row">
    <div class="tx-icon" style="background:var(--light-green);">${icon}</div>
    <div class="tx-info">
      <div class="tx-desc">${t.description} ${typeBadge[t.type] || ''}</div>
      <div class="tx-meta">${metaLine}${acctName ? ' · ' + acctName : ''}</div>
    </div>
    <div class="tx-amount ${cls}">${sign}${fmt(t.amount).replace('₦','₦')}</div>
    <div class="tx-actions">
      <button class="tx-action-btn" onclick="editTransaction('${t.id}')">${iconEdit}</button>
      <button class="tx-action-btn" onclick="deleteTransaction('${t.id}')">${iconDelete}</button>
    </div>
  </div>`;
}

// ============ AI INSIGHTS ============
function generateInsights() {
  const mk = currentMonthKey();
  const insights = [];
  const income = getIncomeTotal(mk);
  const expenses = getExpenseTotal(mk);
  const giving = getGivingTotal(mk);
  const savings = income - expenses;
  const savingsRate = income > 0 ? (savings / income) * 100 : 0;

  // Last month comparison
  const lastMk = getLastNMonthKeys(2)[0];
  const lastExpenses = getExpenseTotal(lastMk);
  const lastSavingsRate = getMonthlySavingsRate(lastMk);

  // Food comparison
  const foodThis = getMonthTransactions(mk).filter(t => t.type === 'expense' && t.category === 'Food').reduce((s,t) => s+t.amount, 0);
  const foodLast = getMonthTransactions(lastMk).filter(t => t.type === 'expense' && t.category === 'Food').reduce((s,t) => s+t.amount, 0);
  if (foodLast > 0 && foodThis > 0) {
    const change = Math.round(((foodThis - foodLast) / foodLast) * 100);
    if (change > 5) {
      insights.push({ type: 'warning', text: `You spent <strong>${change}% more</strong> on food compared to last month (${fmt(foodThis)} vs ${fmt(foodLast)}).` });
    } else if (change < -5) {
      insights.push({ type: 'success', text: `Food spending decreased by <strong>${Math.abs(change)}%</strong> compared to last month. Great job!` });
    }
  }

  // Transportation
  const transport = getMonthTransactions(mk).filter(t => t.type === 'expense' && t.category === 'Transportation').reduce((s,t) => s+t.amount, 0);
  if (transport > 0) {
    const budget = state.budgets['Transportation'];
    if (budget && transport > budget) {
      const over = Math.round((transport / budget) * 100 - 100);
      insights.push({ type: 'danger', text: `Transportation spending exceeded budget by <strong>${over}%</strong> (${fmt(transport)} of ${fmt(budget)}).` });
    } else {
      insights.push({ type: 'info', text: `You have spent <strong>${fmt(transport)}</strong> on transportation this month.` });
    }
  }

  // Savings rate change
  if (lastSavingsRate > 0 && savingsRate > 0) {
    const change = Math.round(savingsRate - lastSavingsRate);
    if (Math.abs(change) >= 3) {
      insights.push({ type: change > 0 ? 'success' : 'warning', text: `Your savings rate ${change > 0 ? 'increased' : 'decreased'} from <strong>${lastSavingsRate}%</strong> to <strong>${Math.round(savingsRate)}%</strong>.` });
    }
  }

  // Salary dependence
  const salaryIncome = getMonthTransactions(mk).filter(t => t.type === 'income' && t.category === 'Salary').reduce((s,t) => s+t.amount, 0);
  if (income > 0 && salaryIncome > 0) {
    const dep = Math.round((salaryIncome / income) * 100);
    insights.push({ type: 'info', text: `<strong>${dep}%</strong> of your income came from salary. ${dep > 80 ? 'Consider growing side-income sources.' : 'Good income diversification.'}` });
  }

  // Subscriptions (active only)
  const subMonthly = state.subscriptions.filter(s => s.status !== 'paused').reduce((s, sub) => {
    return s + (sub.cycle === 'monthly' ? sub.cost : sub.cycle === 'yearly' ? sub.cost/12 : sub.cycle === 'quarterly' ? sub.cost/3 : sub.cost/4.3);
  }, 0);
  if (subMonthly > 0 && expenses > 0) {
    const pct = Math.round((subMonthly / expenses) * 100);
    insights.push({ type: 'info', text: `Subscriptions account for <strong>${pct}%</strong> of monthly spending (${fmt(subMonthly)}/mo).` });
  }

  // Giving
  if (income > 0 && giving > 0) {
    const givePct = Math.round((giving / income) * 100);
    insights.push({ type: 'info', text: `You gave away <strong>${givePct}%</strong> of your income this month (${fmt(giving)}).` });
  }

  // Family support
  const famExp = getMonthTransactions(mk).filter(t => (t.type === 'expense' || t.type === 'giving') && t.category === 'Family Support').reduce((s,t) => s+t.amount, 0);
  const allCats = getCategoryTotals(mk, 'expense');
  const sortedCats = Object.entries(allCats).sort((a,b) => b[1] - a[1]);
  if (sortedCats.length > 1 && famExp > 0) {
    const rank = sortedCats.findIndex(c => c[0] === 'Family Support');
    if (rank === 1) {
      insights.push({ type: 'info', text: `Family support is your <strong>second-largest</strong> expense category at ${fmt(famExp)}.` });
    }
  }

  // Savings rate positive
  if (savingsRate > 0) {
    insights.push({ type: 'success', text: `You're saving <strong>${Math.round(savingsRate)}%</strong> of your income this month — ${savingsRate >= 30 ? 'excellent!' : savingsRate >= 20 ? 'good, keep it up.' : 'consider aiming for 20%+.'}` });
  }

  return insights;
}

function renderAIInsights() {
  const container = document.getElementById('dashInsights');
  const insights = generateInsights();
  if (insights.length === 0) {
    container.innerHTML = '<div class="empty-state">Add more transactions to unlock AI insights</div>';
    return;
  }
  const bgMap = { success: 'var(--success-bg)', warning: 'var(--warning-bg)', danger: 'var(--danger-bg)', info: 'var(--info-bg)' };
  const colorMap = { success: 'var(--success)', warning: 'var(--warning)', danger: 'var(--danger)', info: 'var(--info)' };
  container.innerHTML = insights.map(ins => `<div class="insight-card">
    <div class="insight-icon" style="background:${bgMap[ins.type]};color:${colorMap[ins.type]};">${iconMap[ins.type]}</div>
    <div class="insight-text">${ins.text}</div>
  </div>`).join('');
}

// ============ TRANSACTIONS PAGE ============
function renderTransactions() {
  populateCategoryFilter();
  populateAccountSelect('txFilterAccount', true);
  
  const search = document.getElementById('txSearch').value.toLowerCase().trim();
  const typeFilter = document.getElementById('txFilterType').value;
  const catFilter = document.getElementById('txFilterCategory').value;
  const acctFilter = document.getElementById('txFilterAccount').value;
  const dateRange = document.getElementById('txFilterDateRange').value;
  const dateFrom = document.getElementById('txDateFrom').value;
  const dateTo = document.getElementById('txDateTo').value;
  const amountMin = parseFloat(document.getElementById('txAmountMin').value) || 0;
  const amountMax = parseFloat(document.getElementById('txAmountMax').value) || Infinity;

  let txs = [...state.transactions].sort((a,b) => new Date(b.date) - new Date(a.date));
  
  // Smart search: description, category, tags, or exact amount match
  if (search) {
    const searchNum = parseFloat(search.replace(/[₦,]/g, ''));
    txs = txs.filter(t => {
      const inDesc = t.description.toLowerCase().includes(search);
      const inCat = t.category.toLowerCase().includes(search);
      const inTags = t.tags && t.tags.some(tag => tag.toLowerCase().includes(search));
      const inAmount = !isNaN(searchNum) && Math.abs(t.amount - searchNum) < 1;
      return inDesc || inCat || inTags || inAmount;
    });
  }
  if (typeFilter) txs = txs.filter(t => t.type === typeFilter);
  if (catFilter) txs = txs.filter(t => t.category === catFilter);
  if (acctFilter) txs = txs.filter(t => t.accountId === acctFilter || (t.type === 'transfer' && (t.fromAccountId === acctFilter || t.toAccountId === acctFilter)));
  
  // Date range filter
  if (dateRange) {
    const today = new Date(); today.setHours(0,0,0,0);
    const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
    const last7 = new Date(today); last7.setDate(last7.getDate() - 7);
    const last30 = new Date(today); last30.setDate(last30.getDate() - 30);
    const [thisYear, thisMonth] = currentMonthKey().split('-').map(Number);
    const lastMonthDate = new Date(thisYear, thisMonth - 1, 1);
    const lastMonthKey = `${lastMonthDate.getFullYear()}-${String(lastMonthDate.getMonth()).padStart(2,'0')}`;
    
    txs = txs.filter(t => {
      const d = new Date(t.date);
      if (dateRange === 'today') return d.toDateString() === today.toDateString();
      if (dateRange === 'yesterday') return d.toDateString() === yesterday.toDateString();
      if (dateRange === 'last7') return d >= last7;
      if (dateRange === 'last30') return d >= last30;
      if (dateRange === 'thisMonth') return monthKey(t.date) === currentMonthKey();
      if (dateRange === 'lastMonth') return monthKey(t.date) === lastMonthKey;
      if (dateRange === 'custom') {
        const fromOk = !dateFrom || new Date(t.date) >= new Date(dateFrom);
        const toOk = !dateTo || new Date(t.date) <= new Date(dateTo + 'T23:59:59');
        return fromOk && toOk;
      }
      return true;
    });
  }
  
  // Amount range filter
  if (amountMin > 0 || amountMax < Infinity) {
    txs = txs.filter(t => t.amount >= amountMin && t.amount <= amountMax);
  }

  // Summary cards with icons
  const totalIn = txs.filter(t => t.type === 'income').reduce((s,t) => s + t.amount, 0);
  const totalOut = txs.filter(t => t.type !== 'income').reduce((s,t) => s + t.amount, 0);
  const net = totalIn - totalOut;
  const summaryEl = document.getElementById('txSummary');
  if (summaryEl) {
    summaryEl.innerHTML = `
      <div class="summary-card">
        <div class="summary-icon" style="background:var(--green-light);color:var(--green-accent);">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
        </div>
        <div>
          <div class="summary-label">Total inflow</div>
          <div class="summary-value" style="color:var(--green-accent);">${fmt(totalIn)}</div>
          <div class="summary-sub">${txs.filter(t => t.type === 'income').length} transactions</div>
        </div>
      </div>
      <div class="summary-card">
        <div class="summary-icon" style="background:var(--red-light);color:var(--red-accent);">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/></svg>
        </div>
        <div>
          <div class="summary-label">Total outflow</div>
          <div class="summary-value" style="color:var(--red-accent);">${fmt(totalOut)}</div>
          <div class="summary-sub">${txs.filter(t => t.type !== 'income').length} transactions</div>
        </div>
      </div>
      <div class="summary-card">
        <div class="summary-icon" style="background:${net >= 0 ? 'var(--green-light)' : 'var(--red-light)'};color:${net >= 0 ? 'var(--green-accent)' : 'var(--red-accent)'};">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>
        </div>
        <div>
          <div class="summary-label">Net cash flow</div>
          <div class="summary-value" style="color:${net >= 0 ? 'var(--green-accent)' : 'var(--red-accent)'};">${net >= 0 ? '+' : '−'}${fmt(Math.abs(net))}</div>
          <div class="summary-sub">${txs.length} total transactions</div>
        </div>
      </div>`;
  }

  // Build active filter chips
  const chipsEl = document.getElementById('txFilterChips');
  if (chipsEl) {
    let chips = [];
    if (search) chips.push({ label: 'Search: ' + search, clear: () => { document.getElementById('txSearch').value = ''; renderTransactions(); } });
    if (typeFilter) chips.push({ label: 'Type: ' + typeFilter, clear: () => { document.getElementById('txFilterType').value = ''; renderTransactions(); } });
    if (catFilter) chips.push({ label: 'Category: ' + catFilter, clear: () => { document.getElementById('txFilterCategory').value = ''; renderTransactions(); } });
    if (acctFilter) {
      const acctName = getAccountName(acctFilter) || acctFilter;
      chips.push({ label: 'Account: ' + acctName, clear: () => { document.getElementById('txFilterAccount').value = ''; renderTransactions(); } });
    }
    if (dateRange && dateRange !== 'custom') {
      const rangeLabels = { today: 'Today', yesterday: 'Yesterday', last7: 'Last 7 days', last30: 'Last 30 days', thisMonth: 'This month', lastMonth: 'Last month' };
      chips.push({ label: 'Date: ' + (rangeLabels[dateRange] || dateRange), clear: () => { document.getElementById('txFilterDateRange').value = ''; onDateRangeChange(); renderTransactions(); } });
    }
    if (dateRange === 'custom' && (dateFrom || dateTo)) {
      chips.push({ label: 'Date: ' + (dateFrom || '...') + ' to ' + (dateTo || '...'), clear: () => { document.getElementById('txFilterDateRange').value = ''; document.getElementById('txDateFrom').value = ''; document.getElementById('txDateTo').value = ''; onDateRangeChange(); renderTransactions(); } });
    }
    if (amountMin > 0) chips.push({ label: 'Min: ' + fmt(amountMin), clear: () => { document.getElementById('txAmountMin').value = ''; renderTransactions(); } });
    if (amountMax < Infinity) chips.push({ label: 'Max: ' + fmt(amountMax), clear: () => { document.getElementById('txAmountMax').value = ''; renderTransactions(); } });
    
    let chipsHtml = chips.map((c, i) => `<button class="filter-chip" onclick="window._txChipClear_${i}()">${c.label}<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>`).join('');
    if (chips.length > 1) chipsHtml += `<button class="filter-chip-clear" onclick="clearAllTxFilters()">Clear all</button>`;
    chips.forEach((c, i) => { window['_txChipClear_' + i] = c.clear; });
    chipsEl.innerHTML = chipsHtml;
  }

  // Results count
  const countEl = document.getElementById('txResultsCount');
  if (countEl) {
    const totalTx = state.transactions.length;
    countEl.textContent = txs.length === totalTx ? totalTx + ' transactions' : txs.length + ' of ' + totalTx + ' transactions';
  }

  const container = document.getElementById('txList');
  if (txs.length === 0) {
    container.innerHTML = '<div class="empty-state">No transactions found</div>';
    return;
  }

  // Pagination
  const totalPages = Math.ceil(txs.length / TX_PER_PAGE);
  if (txPage > totalPages) txPage = totalPages;
  if (txPage < 1) txPage = 1;
  const start = (txPage - 1) * TX_PER_PAGE;
  const paged = txs.slice(start, start + TX_PER_PAGE);

  let html = paged.map(renderTxRow).join('');

  // Pagination controls
  if (totalPages > 1) {
    html += '<div style="display:flex;justify-content:center;align-items:center;gap:8px;margin-top:20px;flex-wrap:wrap;">';
    for (let i = 1; i <= totalPages; i++) {
      html += `<button onclick="setTxPage(${i})" class="btn ${i === txPage ? 'btn-primary' : ''}" style="min-width:36px;padding:6px 12px;border-radius:8px;font-size:13px;font-weight:500;">${i}</button>`;
    }
    html += `<span style="font-size:12px;color:var(--text-secondary);margin-left:8px;">Page ${txPage} of ${totalPages}</span>`;
    html += '</div>';
  }

  container.innerHTML = html;
}

function populateCategoryFilter() {
  const select = document.getElementById('txFilterCategory');
  const current = select.value;
  const cats = new Set(state.transactions.map(t => t.category));
  select.innerHTML = '<option value="">All categories</option>' + [...cats].sort().map(c => '<option value="' + escapeHtml(c) + '">' + escapeHtml(c) + '</option>').join('');
  select.value = current;
}

function populateMonthFilter() {
  const select = document.getElementById('txFilterMonth');
  const current = select.value;
  const months = new Set(state.transactions.map(t => monthKey(t.date)));
  select.innerHTML = '<option value="">All time</option>' + [...months].sort().reverse().map(m => {
    const [y, mo] = m.split('-').map(Number);
    const label = new Date(y, mo, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    return `<option value="${m}">${label}</option>`;
  }).join('');
  select.value = current;
}

function populateMonthSelect(selectId) {
  const select = document.getElementById(selectId);
  if (!select) return;
  const current = select.value;
  const months = getLastNMonthKeys(12);
  select.innerHTML = months.reverse().map(m => {
    const [y, mo] = m.split('-').map(Number);
    const d = new Date(y, mo, 1);
    const isCurrent = m === currentMonthKey();
    const label = (isCurrent ? 'This month (' : '') + d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) + (isCurrent ? ')' : '');
    return `<option value="${m}" ${m === current ? 'selected' : ''}>${label}</option>`;
  }).join('');
  if (!current) select.value = currentMonthKey();
}

// ============ INCOME PAGE ============
function renderIncome() {
  populateMonthSelect('incMonthSelect');
  const mk = document.getElementById('incMonthSelect').value || currentMonthKey();
  const monthKeys = getLastNMonthKeys(12);
  const mkIdx = monthKeys.indexOf(mk);
  const lastMk = mkIdx > 0 ? monthKeys[mkIdx - 1] : getLastNMonthKeys(2)[0];
  const income = getIncomeTotal(mk);
  const lastIncome = getIncomeTotal(lastMk);
  const growth = lastIncome > 0 ? Math.round(((income - lastIncome) / lastIncome) * 100) : 0;
  const isCurrent = mk === currentMonthKey();
  const monthLabel = getMonthLabelFromKey(mk);

  document.getElementById('incMonthLabel').textContent = isCurrent ? 'This month income' : monthLabel + ' income';
  document.getElementById('incLastMonthLabel').textContent = 'Previous month income';
  document.getElementById('incMonthTotal').textContent = fmt(income);
  document.getElementById('incLastMonth').textContent = fmt(lastIncome);
  document.getElementById('incGrowth').textContent = (growth >= 0 ? '+' : '') + growth + '%';
  document.getElementById('incGrowth').className = 'metric-value ' + (growth >= 0 ? 'metric-positive' : 'metric-negative');
  document.getElementById('incListTitle').textContent = isCurrent ? 'Income transactions (this month)' : 'Income transactions — ' + monthLabel;

  const salaryIncome = getMonthTransactions(mk).filter(t => t.category === 'Salary').reduce((s,t) => s+t.amount, 0);
  const dep = income > 0 ? Math.round((salaryIncome / income) * 100) : 0;
  document.getElementById('incSalaryDep').textContent = dep + '%';

  // Income breakdown chart
  const cats = getCategoryTotals(mk, 'income');
  const sorted = Object.entries(cats).sort((a,b) => b[1] - a[1]);
  destroyChart('chartIncomeBreakdown');
  charts.chartIncomeBreakdown = new Chart(document.getElementById('chartIncomeBreakdown'), {
    type: 'doughnut',
    data: { labels: sorted.map(s => s[0]), datasets: [{ data: sorted.map(s => s[1]), backgroundColor: chartColors.palette, borderWidth: 0 }] },
    options: { ...chartDefaults, cutout: '65%', scales: {}, plugins: { ...chartDefaults.plugins, tooltip: { ...chartDefaults.plugins.tooltip, callbacks: { label: (ctx) => ctx.label + ': ' + fmt(ctx.parsed) } } } }
  });

  // Income trend
  const months = getLastNMonthKeys(4);
  destroyChart('chartIncomeTrend');
  charts.chartIncomeTrend = new Chart(document.getElementById('chartIncomeTrend'), {
    type: 'line',
    data: { labels: months.map(getMonthLabelFromKey), datasets: [{ data: months.map(m => getIncomeTotal(m)), borderColor: chartColors.income, backgroundColor: 'var(--chart-fill)', fill: true, tension: 0.3, pointRadius: 4, pointBackgroundColor: chartColors.income }] },
    options: chartDefaults
  });

  // Income transactions
  const txs = getMonthTransactions(mk).filter(t => t.type === 'income').sort((a,b) => new Date(b.date) - new Date(a.date));
  document.getElementById('incList').innerHTML = txs.length > 0 ? txs.map(renderTxRow).join('') : '<div class="empty-state">No income recorded for ' + monthLabel + '</div>';
}

// ============ EXPENSES PAGE ============
function renderExpenses() {
  populateMonthSelect('expMonthSelect');
  const mk = document.getElementById('expMonthSelect').value || currentMonthKey();
  const monthKeys = getLastNMonthKeys(12);
  const mkIdx = monthKeys.indexOf(mk);
  const lastMk = mkIdx > 0 ? monthKeys[mkIdx - 1] : getLastNMonthKeys(2)[0];
  const expenses = getExpenseTotal(mk);
  const lastExpenses = getExpenseTotal(lastMk);
  const isCurrent = mk === currentMonthKey();
  const dayOfMonth = isCurrent ? new Date().getDate() : new Date(parseInt(mk.split('-')[0]), parseInt(mk.split('-')[1]) + 1, 0).getDate();
  const dailyAvg = expenses > 0 ? Math.round(expenses / dayOfMonth) : 0;
  const cats = getCategoryTotals(mk, 'expense');
  const sorted = Object.entries(cats).sort((a,b) => b[1] - a[1]);
  const largest = sorted[0] ? sorted[0][0] : '—';
  const vsLast = lastExpenses > 0 ? Math.round(((expenses - lastExpenses) / lastExpenses) * 100) : 0;
  const monthLabel = getMonthLabelFromKey(mk);

  document.getElementById('expMonthLabel').textContent = isCurrent ? 'This month expenses' : monthLabel + ' expenses';
  document.getElementById('expMonthTotal').textContent = fmt(expenses);
  document.getElementById('expMonthTotal').style.color = expenses > 0 ? 'var(--danger)' : 'var(--text)';
  document.getElementById('expDailyAvg').textContent = fmt(dailyAvg);
  document.getElementById('expDailyAvg').style.color = dailyAvg > 0 ? 'var(--danger)' : 'var(--text)';
  document.getElementById('expLargestCat').textContent = largest;
  document.getElementById('expVsLast').textContent = (vsLast >= 0 ? '+' : '') + vsLast + '%';
  document.getElementById('expVsLast').className = 'metric-value ' + (vsLast > 0 ? 'metric-negative' : 'metric-positive');
  document.getElementById('expBreakdownTitle').textContent = 'Where your money went — ' + monthLabel;
  document.getElementById('expListTitle').textContent = isCurrent ? 'Expense transactions (this month)' : 'Expense transactions — ' + monthLabel;

  // Breakdown
  destroyChart('chartExpBreakdown');
  charts.chartExpBreakdown = new Chart(document.getElementById('chartExpBreakdown'), {
    type: 'doughnut',
    data: { labels: sorted.map(s => s[0]), datasets: [{ data: sorted.map(s => s[1]), backgroundColor: chartColors.palette, borderWidth: 0 }] },
    options: { ...chartDefaults, cutout: '65%', scales: {}, plugins: { ...chartDefaults.plugins, tooltip: { ...chartDefaults.plugins.tooltip, callbacks: { label: (ctx) => ctx.label + ': ' + fmt(ctx.parsed) } } } }
  });

  // Trend
  const months = getLastNMonthKeys(4);
  destroyChart('chartExpTrend');
  charts.chartExpTrend = new Chart(document.getElementById('chartExpTrend'), {
    type: 'line',
    data: { labels: months.map(getMonthLabelFromKey), datasets: [{ data: months.map(m => getExpenseTotal(m)), borderColor: chartColors.expense, backgroundColor: 'rgba(217,92,92,0.08)', fill: true, tension: 0.3, pointRadius: 4, pointBackgroundColor: chartColors.expense }] },
    options: chartDefaults
  });

  // Category breakdown cards
  const breakdownEl = document.getElementById('expBreakdownCards');
  if (breakdownEl && sorted.length > 0) {
    breakdownEl.innerHTML = sorted.map(([cat, amt]) => {
      const catPct = expenses > 0 ? Math.round((amt / expenses) * 100) : 0;
      const icon = categoryIcons[state.budgetIcons[cat]] || categoryIcons[cat] || categoryIcons['Other'];
      return `<div class="budget-card">
        <div class="budget-card-icon">${icon}</div>
        <div class="budget-card-body">
          <div class="budget-card-top">
            <div>
              <div class="budget-card-name">${cat}</div>
              <div style="font-size:12px;color:var(--text-tertiary);margin-top:2px;">${catPct}% of total expenses</div>
            </div>
            <span class="badge badge-gray" style="font-size:12px;">${catPct}%</span>
          </div>
          <div class="progress-bar-lg"><div class="progress-fill-lg" style="width:${catPct}%;background:var(--danger);"></div></div>
          <div class="budget-card-bottom">
            <span class="budget-card-stat"><strong style="color:var(--danger);font-size:15px;font-weight:700;">${fmt(amt)}</strong></span>
          </div>
        </div>
      </div>`;
    }).join('');
  }

  // List
  const txs = getMonthTransactions(mk).filter(t => t.type === 'expense').sort((a,b) => new Date(b.date) - new Date(a.date));
  document.getElementById('expList').innerHTML = txs.length > 0 ? txs.map(renderTxRow).join('') : '<div class="empty-state">No expenses recorded for ' + monthLabel + '</div>';
}

let currentSubFilter = 'all';
let txPage = 1;
const TX_PER_PAGE = 15;

function setTxPage(page) {
  txPage = page;
  renderTransactions();
  // Scroll to top of tx list
  const el = document.getElementById('txList');
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function onDateRangeChange() {
  const val = document.getElementById('txFilterDateRange').value;
  const customWrap = document.getElementById('txDateCustom');
  if (customWrap) customWrap.style.display = (val === 'custom') ? '' : 'none';
  renderTransactions();
}

function clearAllTxFilters() {
  document.getElementById('txSearch').value = '';
  document.getElementById('txFilterType').value = '';
  document.getElementById('txFilterCategory').value = '';
  document.getElementById('txFilterAccount').value = '';
  document.getElementById('txFilterDateRange').value = '';
  document.getElementById('txDateFrom').value = '';
  document.getElementById('txDateTo').value = '';
  document.getElementById('txAmountMin').value = '';
  document.getElementById('txAmountMax').value = '';
  onDateRangeChange();
}
function setSubFilter(el) {
  document.querySelectorAll('[data-sfilter]').forEach(c => c.classList.remove('active'));
  el.classList.add('active');
  currentSubFilter = el.dataset.sfilter;
  renderSubscriptions();
}

// ============ SUBSCRIPTIONS PAGE ============
function renderSubscriptions() {
  const activeSubs = state.subscriptions.filter(s => s.status !== 'paused');
  const pausedSubs = state.subscriptions.filter(s => s.status === 'paused');

  const monthly = activeSubs.reduce((s, sub) => s + (sub.cycle === 'monthly' ? sub.cost : sub.cycle === 'yearly' ? sub.cost/12 : sub.cycle === 'quarterly' ? sub.cost/3 : sub.cost/4.3), 0);
  const annual = monthly * 12;
  document.getElementById('subMonthly').textContent = fmt(monthly);
  document.getElementById('subAnnual').textContent = fmt(annual);
  document.getElementById('subCount').textContent = activeSubs.length;

  const container = document.getElementById('subList');

  // Determine which subscriptions to show based on filter
  let subsToShow = [...state.subscriptions];
  if (currentSubFilter === 'active') {
    subsToShow = activeSubs;
  } else if (currentSubFilter === 'paused') {
    subsToShow = pausedSubs;
  }

  if (subsToShow.length === 0) {
    const emptyMsg = currentSubFilter === 'active' ? 'No active subscriptions' : currentSubFilter === 'paused' ? 'No paused subscriptions' : 'No subscriptions yet';
    container.innerHTML = '<div class="empty-state">' + emptyMsg + '</div>';
    return;
  }

  const allSorted = subsToShow.sort((a,b) => {
    if (a.status === 'paused' && b.status !== 'paused') return 1;
    if (a.status !== 'paused' && b.status === 'paused') return -1;
    return new Date(a.renewal) - new Date(b.renewal);
  });

  const html = allSorted.map(s => {
    const days = daysUntil(s.renewal);
    let badge = '';
    if (s.status === 'paused') badge = '<span class="badge badge-gray">Paused</span>';
    else if (days <= 3) badge = '<span class="badge badge-danger">' + days + 'd</span>';
    else if (days <= 7) badge = '<span class="badge badge-warning">' + days + 'd</span>';
    else badge = '<span class="badge badge-gray">' + days + 'd</span>';
    const logoHtml = getSubscriptionLogoHtml(s);
    const pausedStyle = s.status === 'paused' ? 'opacity:0.6;' : '';
    return `<div class="sub-item" style="${pausedStyle}">
      <div style="flex-shrink:0;">${logoHtml}</div>
      <div class="sub-info">
        <div class="sub-name">${s.name}</div>
        <div class="sub-meta">${s.cycle} · renews ${fmtDate(s.renewal)} ${s.notes ? '· ' + s.notes : ''}</div>
      </div>
      <div style="text-align:right;">
        <div class="sub-cost">${fmt(s.cost)}</div>
        <div style="margin-top:4px;">${badge}</div>
      </div>
      <div class="tx-actions" style="opacity:1;">
        <div class="toggle-sm ${s.status === 'active' ? 'on' : ''}" onclick="toggleSubscriptionStatus('${s.id}')" title="${s.status === 'paused' ? 'Activate' : 'Pause'}"></div>
        <button class="tx-action-btn" onclick="deleteSubscription('${s.id}')">${iconDelete}</button>
      </div>
    </div>`;
  }).join('');
  container.innerHTML = html;
}

function toggleSubscriptionStatus(id) {
  const sub = state.subscriptions.find(s => s.id === id);
  if (!sub) return;
  sub.status = sub.status === 'paused' ? 'active' : 'paused';
  saveData();
  showToast(sub.status === 'active' ? 'Subscription activated' : 'Subscription paused');
  renderSubscriptions();
}

function editSubscription(id) {
  const sub = state.subscriptions.find(s => s.id === id);
  if (!sub) return;
  openSubModal();
  setTimeout(() => {
    editingSubId = id;
    document.getElementById('subModalTitle').textContent = 'Edit subscription';
    document.getElementById('subName').value = sub.name;
    document.getElementById('subCost').value = sub.cost;
    document.getElementById('subCycle').value = sub.cycle;
    document.getElementById('subRenewal').value = sub.renewal;
    document.getElementById('subCategory').value = sub.category || 'Other';
    document.getElementById('subNotes').value = sub.notes || '';
    document.getElementById('toggleSubActive').classList.toggle('on', sub.status !== 'paused');
    // Set logo
    document.getElementById('subLogoInput').value = sub.logo || '';
    renderSubLogoSelector();
    if (sub.logo) selectSubLogo(sub.logo);
  }, 50);
}

// ============ GIVING PAGE ============
function renderGiving() {
  const mk = currentMonthKey();
  const giving = getGivingTotal(mk);
  const income = getIncomeTotal(mk);
  const pct = income > 0 ? Math.round((giving / income) * 100) : 0;

  // Annual giving
  const months = getLastNMonthKeys(12);
  const annual = months.reduce((s, m) => s + getGivingTotal(m), 0);

  // Top recipient
  const cats = getCategoryTotals(mk, 'giving');
  const sorted = Object.entries(cats).sort((a,b) => b[1] - a[1]);
  const topRecipient = sorted[0] ? sorted[0][0] : '—';

  document.getElementById('giveMonth').textContent = fmt(giving);
  document.getElementById('giveAnnual').textContent = fmt(annual);
  document.getElementById('givePercent').textContent = pct + '%';
  document.getElementById('giveTopRecipient').textContent = topRecipient;

  // Breakdown
  destroyChart('chartGiveBreakdown');
  if (sorted.length > 0) {
    charts.chartGiveBreakdown = new Chart(document.getElementById('chartGiveBreakdown'), {
      type: 'doughnut',
      data: { labels: sorted.map(s => s[0]), datasets: [{ data: sorted.map(s => s[1]), backgroundColor: chartColors.palette, borderWidth: 0 }] },
      options: { ...chartDefaults, cutout: '65%', scales: {}, plugins: { ...chartDefaults.plugins, tooltip: { ...chartDefaults.plugins.tooltip, callbacks: { label: (ctx) => ctx.label + ': ' + fmt(ctx.parsed) } } } }
    });
  }

  // Trend
  destroyChart('chartGiveTrend');
  charts.chartGiveTrend = new Chart(document.getElementById('chartGiveTrend'), {
    type: 'bar',
    data: { labels: months.slice(-4).map(getMonthLabelFromKey), datasets: [{ data: months.slice(-4).map(m => getGivingTotal(m)), backgroundColor: chartColors.giving, borderRadius: 6 }] },
    options: chartDefaults
  });

  // List
  const txs = getMonthTransactions(mk).filter(t => t.type === 'giving').sort((a,b) => new Date(b.date) - new Date(a.date));
  document.getElementById('giveList').innerHTML = txs.length > 0 ? txs.map(renderTxRow).join('') : '<div class="empty-state">No giving this month</div>';
}

// ============ BUDGETS PAGE ============
function renderBudgets() {
  const mk = currentMonthKey();
  const container = document.getElementById('budgetList');
  const budgets = Object.entries(state.budgets);

  // Summary calculations
  const totalLimit = budgets.reduce((s, [,l]) => s + l, 0);
  const totalSpent = budgets.reduce((s, [cat]) => s + getMonthTransactions(mk).filter(t => t.type === 'expense' && t.category === cat).reduce((ss, t) => ss + t.amount, 0), 0);
  const totalRemain = Math.max(0, totalLimit - totalSpent);
  const usagePct = totalLimit > 0 ? Math.round((totalSpent / totalLimit) * 100) : 0;

  document.getElementById('budgetTotal').textContent = fmt(totalLimit);
  document.getElementById('budgetSpent').textContent = fmt(totalSpent);
  document.getElementById('budgetRemain').textContent = fmt(totalRemain);
  document.getElementById('budgetUsage').textContent = usagePct + '%';

  // Insight card — smarter alerts
  const overBudgetCount = budgets.filter(([cat, limit]) => {
    const spent = getMonthTransactions(mk).filter(t => t.type === 'expense' && t.category === cat).reduce((s, t) => s + t.amount, 0);
    return spent > limit;
  }).length;
  const warningBudgetCount = budgets.filter(([cat, limit]) => {
    const spent = getMonthTransactions(mk).filter(t => t.type === 'expense' && t.category === cat).reduce((s, t) => s + t.amount, 0);
    return spent >= limit * 0.8 && spent <= limit;
  }).length;
  const underBudgetCount = budgets.filter(([cat, limit]) => {
    const spent = getMonthTransactions(mk).filter(t => t.type === 'expense' && t.category === cat).reduce((s, t) => s + t.amount, 0);
    return spent < limit * 0.8;
  }).length;
  const insightEl = document.getElementById('budgetInsight');
  if (insightEl) {
    if (overBudgetCount > 0) {
      insightEl.style.display = 'flex';
      insightEl.style.background = 'var(--danger-bg)';
      insightEl.style.borderColor = 'var(--danger)';
      document.getElementById('budgetInsightTitle').textContent = 'Over budget!';
      document.getElementById('budgetInsightDesc').textContent = overBudgetCount + " categor" + (overBudgetCount === 1 ? 'y has' : 'ies have') + " exceeded the limit. Cut back to stay on track.";
    } else if (warningBudgetCount > 0) {
      insightEl.style.display = 'flex';
      insightEl.style.background = 'var(--warning-bg)';
      insightEl.style.borderColor = 'var(--warning)';
      document.getElementById('budgetInsightTitle').textContent = 'Nearing limit';
      document.getElementById('budgetInsightDesc').textContent = warningBudgetCount + " categor" + (warningBudgetCount === 1 ? 'y is' : 'ies are') + " at 80% or more of the budget.";
    } else if (budgets.length > 0) {
      insightEl.style.display = 'flex';
      insightEl.style.background = 'var(--success-bg)';
      insightEl.style.borderColor = 'var(--success)';
      document.getElementById('budgetInsightTitle').textContent = 'Great job!';
      document.getElementById('budgetInsightDesc').textContent = "You're spending less than planned in " + underBudgetCount + " categor" + (underBudgetCount === 1 ? 'y' : 'ies') + " this month.";
    } else {
      insightEl.style.display = 'none';
    }
  }

  if (budgets.length === 0) {
    container.innerHTML = '<div class="empty-state">No budgets set. Set a monthly budget to start tracking.</div>';
    return;
  }

  container.innerHTML = budgets.map(([cat, limit]) => {
    const spent = getMonthTransactions(mk).filter(t => t.type === 'expense' && t.category === cat).reduce((s, t) => s + t.amount, 0);
    const pct = Math.min(100, Math.round((spent / limit) * 100));
    const over = spent > limit;
    const remain = over ? 0 : limit - spent;
    const barClass = over ? 'danger' : (pct >= 80 ? 'warning' : '');
    const healthPct = Math.round(((limit - spent) / limit) * 100);
    const healthText = healthPct >= 50 ? 'healthy' : (healthPct > 20 ? 'fair' : 'critical');
    const weekly = limit / 4.3;

    let tagClass = 'essential';
    let tagText = 'Essential';
    if (['Entertainment', 'Shopping', 'Subscriptions'].includes(cat)) { tagClass = 'lifestyle'; tagText = 'Lifestyle'; }

    const detailId = 'bd-' + cat.replace(/\s+/g, '-');
    // Alert banner for this card
    let alertBanner = '';
    if (over) {
      alertBanner = `<div class="budget-alert-bar danger" style="margin-bottom:10px;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>Over budget by ${fmt(spent - limit)}</div>`;
    } else if (pct >= 80) {
      alertBanner = `<div class="budget-alert-bar warning" style="margin-bottom:10px;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>${Math.round(pct)}% used — only ${fmt(remain)} left</div>`;
    }

    return `<div class="budget-item-card">
      ${alertBanner}
      <div class="budget-item-top">
        <div class="budget-item-icon">${categoryIcons[state.budgetIcons[cat]] || categoryIcons[cat] || categoryIcons['Miscellaneous']}</div>
        <div class="budget-item-info">
          <div class="budget-item-name-row">
            <div class="budget-item-name">${cat}</div>
            <div class="budget-item-tag ${tagClass}">${tagText}</div>
          </div>
          <div class="budget-item-meta">Monthly: ${fmt(limit)} · Weekly: ${fmt(weekly)}</div>
        </div>
        <div style="display:flex;align-items:center;gap:8px;">
          <div class="budget-item-health">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>
            ${healthPct}% ${healthText}
          </div>
          <div class="budget-item-actions">
            <button class="budget-item-btn" onclick="editBudget('${cat}')">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>
            </button>
            <button class="budget-item-btn" onclick="deleteBudget('${cat}')">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
            </button>
          </div>
          <button class="budget-item-menu" onclick="toggleBudgetDetails('${detailId}')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/></svg>
          </button>
        </div>
      </div>
      <div class="budget-progress-wrap">
        <div class="budget-progress-bar ${barClass}" style="width:${pct}%"></div>
      </div>
      <div class="budget-item-bottom">
        <span class="budget-spent">${fmt(spent)} spent</span>
        <span class="budget-pct">${pct}% used</span>
        <span class="budget-remain ${over ? 'Over' : ''}">${over ? fmt(spent - limit) + ' over' : fmt(remain) + ' remaining'}</span>
      </div>
      <div class="budget-item-details" id="${detailId}">
        <div class="budget-detail-row"><span>Type</span><span class="badge ${tagClass === 'essential' ? 'badge-success' : 'badge-gray'}" style="font-size:11px;padding:2px 8px;">${tagText}</span></div>
        <div class="budget-detail-row"><span>Monthly budget</span><span>${fmt(limit)}</span></div>
        <div class="budget-detail-row"><span>Weekly budget</span><span>${fmt(weekly)}</span></div>
        <div class="budget-detail-row"><span>Health</span><span style="color:${healthPct >= 50 ? 'var(--green-accent)' : healthPct > 20 ? 'var(--amber-accent)' : 'var(--red-accent)'}">${healthPct}% ${healthText}</span></div>
        <div class="budget-detail-actions">
          <button onclick="editBudget('${cat}')">Edit budget</button>
          <button class="danger" onclick="deleteBudget('${cat}')">Delete</button>
        </div>
      </div>
    </div>`;
  }).join('');
}

let currentGoalFilter = 'all';
function setGoalFilter(el) {
  document.querySelectorAll('[data-gfilter]').forEach(c => c.classList.remove('active'));
  el.classList.add('active');
  currentGoalFilter = el.dataset.gfilter;
  renderGoals();
}

// ============ GOALS PAGE ============
function renderGoals() {
  const totalSaved = state.goals.reduce((s, g) => s + (g.current || 0), 0);
  const totalTarget = state.goals.reduce((s, g) => s + (g.target || 0), 0);
  const avgProgress = totalTarget > 0 ? Math.round((totalSaved / totalTarget) * 100) : 0;

  let nextGoal = null;
  const sortedByDate = [...state.goals].filter(g => g.date).sort((a,b) => new Date(a.date) - new Date(b.date));
  if (sortedByDate.length > 0) nextGoal = sortedByDate[0];

  const elSaved = document.getElementById('goalsTotalSaved');
  const elTarget = document.getElementById('goalsTotalTarget');
  const elAvg = document.getElementById('goalsAvgProgress');
  const elNextDate = document.getElementById('goalsNextDate');
  const elNextName = document.getElementById('goalsNextName');

  if (elSaved) elSaved.textContent = fmt(totalSaved);
  if (elTarget) elTarget.textContent = fmt(totalTarget);
  if (elAvg) elAvg.textContent = avgProgress + '%';
  if (elNextDate) elNextDate.textContent = nextGoal ? fmtDate(nextGoal.date) : '—';
  if (elNextName) elNextName.textContent = nextGoal ? nextGoal.name : '—';

  const container = document.getElementById('goalList');
  if (!container) return;

  if (state.goals.length === 0) {
    container.innerHTML = '<div class="empty-state">No goals yet. Click "New goal" to start saving.</div>';
    return;
  }

  let goals = [...state.goals];
  if (currentGoalFilter !== 'all') {
    goals = goals.filter(g => (g.priority || 'medium') === currentGoalFilter);
  }

  const sortEl = document.getElementById('goalSort');
  const sort = sortEl ? sortEl.value : 'priority';
  if (sort === 'priority') {
    const order = { high: 0, medium: 1, low: 2 };
    goals.sort((a,b) => (order[a.priority||'medium'] || 1) - (order[b.priority||'medium'] || 1));
  } else if (sort === 'progress') {
    goals.sort((a,b) => (((b.current||0)/(b.target||1))||0) - (((a.current||0)/(a.target||1))||0));
  } else if (sort === 'date') {
    goals.sort((a,b) => new Date(a.date||'9999') - new Date(b.date||'9999'));
  } else if (sort === 'amount') {
    goals.sort((a,b) => (b.target||0) - (a.target||0));
  }

  if (goals.length === 0) {
    container.innerHTML = '<div class="empty-state">No goals match this filter.</div>';
    return;
  }

  container.innerHTML = goals.map(g => {
    const pct = g.target > 0 ? Math.round(((g.current||0) / g.target) * 100) : 0;
    const remaining = Math.max(0, g.target - (g.current||0));
    const daysLeft = g.date ? daysUntil(g.date) : null;
    const monthlyTarget = daysLeft && daysLeft > 0 ? Math.ceil(remaining / (daysLeft / 30)) : 0;
    const priority = g.priority || 'medium';
    const badgeClass = priority === 'high' ? 'high' : (priority === 'medium' ? 'medium' : 'low');
    const badgeText = priority.charAt(0).toUpperCase() + priority.slice(1) + ' priority';
    const listId = 'contrib-list-' + g.id;
    const history = (g.contributions || []).sort((a,b) => new Date(b.date) - new Date(a.date));

    let historyHtml = '';
    if (history.length > 0) {
      historyHtml = '<div id="' + listId + '" style="display:none;margin-top:12px;">' +
        history.map(c => {
          const sourceLabel = c.sourceType === 'account' ? (c.sourceName || getAccountName(c.sourceId)) : (c.sourceName || 'Custom');
          return '<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border-secondary);font-size:13px;color:var(--text);"><span>' + fmtDate(c.date) + ' · ' + sourceLabel + '</span><span style="font-weight:600;color:var(--text);">' + fmt(c.amount) + '</span></div>';
        }).join('') +
        '</div>';
    }

    const goalDetailId = 'gd-' + g.id;
    const goalIcon = getGoalIcon(g);
    return `<div class="goal-card">
      <div class="goal-card-top">
        <div class="goal-icon-wrap">
          ${goalIcon}
        </div>
        <div class="goal-info">
          <div class="goal-name-row">
            <div class="goal-name">${g.name}</div>
            <div class="goal-badge ${badgeClass}">${badgeText}</div>
            <button class="goal-item-menu" onclick="toggleGoalDetails('${goalDetailId}')">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/></svg>
            </button>
          </div>
          <div class="goal-desc">${g.notes || 'Financial goal'}</div>
          <div class="goal-target-line">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            ${g.date ? 'Target: ' + fmtDate(g.date) + (daysLeft !== null ? ' (' + daysLeft + ' days left)' : '') : 'No target date'}
          </div>
          <div class="goal-progress-row">
            <div class="goal-progress-left">
              <div class="goal-saved-big">${fmt(g.current||0)} <span>saved</span></div>
              <div class="goal-target-small">of ${fmt(g.target)} target</div>
            </div>
            <div class="goal-progress-bar-wrap">
              <div class="goal-progress-bar" style="width:${pct}%"></div>
            </div>
            <div class="goal-percent">${pct}%</div>
            <div class="goal-right-box">
              <div class="goal-right-amount">${fmt(remaining)}</div>
              <div class="goal-right-label">remaining to goal</div>
            </div>
          </div>
          <div class="goal-bottom-row">
            <div class="goal-monthly">Monthly target <strong>${monthlyTarget > 0 ? fmt(monthlyTarget) : '—'} /mo</strong></div>
            <div class="goal-actions">
              <button class="goal-btn" onclick="openContribModal('${g.id}')">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                Contribute
              </button>
              <button class="goal-btn delete" onclick="deleteGoal('${g.id}')">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                Delete
              </button>
            </div>
          </div>
          ${history.length > 0 ? `<div class="goal-history-toggle" onclick="toggleContribHistory('${listId}', this)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
            <span>Contribution history</span>
            <div class="goal-history-count">${history.length} contributions <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg></div>
          </div>` + historyHtml : ''}
          <div class="goal-item-details" id="${goalDetailId}">
            <div class="goal-detail-row"><span>Description</span><span>${g.notes || '—'}</span></div>
            <div class="goal-detail-row"><span>Monthly target</span><span>${monthlyTarget > 0 ? fmt(monthlyTarget) : '—'}</span></div>
            <div class="goal-detail-row"><span>Priority</span><span class="goal-badge ${badgeClass}" style="font-size:11px;padding:2px 8px;">${badgeText}</span></div>
            <div class="goal-detail-actions">
              <button onclick="openContribModal('${g.id}')">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                Contribute
              </button>
              <button class="danger" onclick="deleteGoal('${g.id}')">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                Delete
              </button>
            </div>
            ${history.length > 0 ? `<div style="margin-top:8px;"><div style="font-size:12px;font-weight:600;color:var(--text);margin-bottom:4px;">Contribution history</div>` + history.map(c => {
              const sourceLabel = c.sourceType === 'account' ? (c.sourceName || getAccountName(c.sourceId)) : (c.sourceName || 'Custom');
              return '<div style="display:flex;justify-content:space-between;padding:4px 0;font-size:12px;color:var(--text-secondary);"><span>' + fmtDate(c.date) + ' · ' + sourceLabel + '</span><span style="font-weight:600;color:var(--text);">' + fmt(c.amount) + '</span></div>';
            }).join('') + '</div>' : ''}
          </div>
        </div>
      </div>
    </div>`;
  }).join('');

  renderGoalContributionChart();
}

function renderGoalContributionChart() {
  destroyChart('chartGoalContributions');
  if (state.goals.length === 0) return;
  const allContribs = [];
  state.goals.forEach(g => {
    (g.contributions || []).forEach(c => {
      allContribs.push({ date: c.date, amount: c.amount, goal: g.name });
    });
  });
  allContribs.sort((a,b) => new Date(a.date) - new Date(b.date));

  if (allContribs.length === 0) {
    const ctx = document.getElementById('chartGoalContributions');
    if (ctx) ctx.parentElement.innerHTML = '<div class="empty-state">No contributions recorded yet. Click \"Contribute\" on a goal to start tracking progress.</div>';
    return;
  }

  // Group by date and sum
  const byDate = {};
  allContribs.forEach(c => {
    byDate[c.date] = (byDate[c.date] || 0) + c.amount;
  });
  const dates = Object.keys(byDate).sort();
  const cumulative = [];
  let running = 0;
  dates.forEach(d => { running += byDate[d]; cumulative.push(running); });

  charts.chartGoalContributions = new Chart(document.getElementById('chartGoalContributions'), {
    type: 'line',
    data: {
      labels: dates.map(d => fmtDate(d)),
      datasets: [{
        label: 'Total contributions',
        data: cumulative,
        borderColor: chartColors.income,
        backgroundColor: 'var(--chart-fill)',
        fill: true,
        tension: 0.3,
        pointRadius: 5,
        pointBackgroundColor: chartColors.income,
        pointBorderColor: '#fff',
        pointBorderWidth: 2
      }]
    },
    options: {
      ...chartDefaults,
      plugins: {
        ...chartDefaults.plugins,
        legend: { display: false },
        tooltip: {
          ...chartDefaults.plugins.tooltip,
          callbacks: {
            title: (items) => items[0].label,
            label: (ctx) => 'Cumulative: ' + fmt(ctx.parsed.y) + ' | Added: ' + fmt(byDate[dates[ctx.dataIndex]])
          }
        }
      }
    }
  });
}

// ============ ANALYTICS PAGE ============
function renderAnalytics() {
  const mk = currentMonthKey();
  const months = getLastNMonthKeys(6);
  const expenses = getExpenseTotal(mk);
  const dayOfMonth = new Date().getDate();
  const dailyAvg = expenses > 0 ? Math.round(expenses / dayOfMonth) : 0;
  const monthlyAvg = months.length > 0 ? Math.round(months.reduce((s, m) => s + getExpenseTotal(m), 0) / months.length) : 0;
  const savingsRate = getMonthlySavingsRate(mk);

  // Expense growth
  const expThis = getExpenseTotal(months[months.length - 1]);
  const expLast = getExpenseTotal(months[months.length - 2]);
  const expGrowth = expLast > 0 ? Math.round(((expThis - expLast) / expLast) * 100) : 0;

  document.getElementById('anDailyAvg').textContent = fmt(dailyAvg);
  document.getElementById('anMonthlyAvg').textContent = fmt(monthlyAvg);
  document.getElementById('anSavingsRate').textContent = savingsRate + '%';
  document.getElementById('anExpGrowth').textContent = (expGrowth >= 0 ? '+' : '') + expGrowth + '%';
  document.getElementById('anExpGrowth').className = 'metric-value ' + (expGrowth > 0 ? 'metric-negative' : 'metric-positive');

  // Income vs Expense
  destroyChart('chartAnIncExp');
  charts.chartAnIncExp = new Chart(document.getElementById('chartAnIncExp'), {
    type: 'bar',
    data: { labels: months.map(getMonthLabelFromKey), datasets: [
      { label: 'Income', data: months.map(m => getIncomeTotal(m)), backgroundColor: chartColors.income, borderRadius: 6 },
      { label: 'Expenses', data: months.map(m => getExpenseTotal(m)), backgroundColor: chartColors.expense, borderRadius: 6 }
    ] },
    options: { ...chartDefaults, plugins: { ...chartDefaults.plugins, legend: { display: true, position: 'bottom', labels: { color: getChartLegendColor(), font: { size: 12 }, boxWidth: 12, padding: 16 } } } }
  });

  // Savings growth
  destroyChart('chartAnSavings');
  charts.chartAnSavings = new Chart(document.getElementById('chartAnSavings'), {
    type: 'line',
    data: { labels: months.map(getMonthLabelFromKey), datasets: [{ data: months.map(m => getSavings(m)), borderColor: chartColors.income, backgroundColor: 'var(--chart-fill)', fill: true, tension: 0.3, pointRadius: 4, pointBackgroundColor: chartColors.income }] },
    options: chartDefaults
  });

  // Category trends (stacked area)
  const topCats = ['Food','Transportation','Rent','Utilities','Shopping'];
  destroyChart('chartAnCategoryTrend');
  charts.chartAnCategoryTrend = new Chart(document.getElementById('chartAnCategoryTrend'), {
    type: 'line',
    data: { labels: months.map(getMonthLabelFromKey), datasets: topCats.map((cat, i) => ({
      label: cat,
      data: months.map(m => getMonthTransactions(m).filter(t => t.type === 'expense' && t.category === cat).reduce((s, t) => s + t.amount, 0)),
      borderColor: chartColors.palette[i],
      backgroundColor: chartColors.palette[i] + '20',
      tension: 0.3, pointRadius: 3, fill: true
    })) },
    options: { ...chartDefaults, plugins: { ...chartDefaults.plugins, legend: { display: true, position: 'bottom', labels: { color: getChartLegendColor(), font: { size: 11 }, boxWidth: 10, padding: 10 } } } }
  });

  // Giving & subscription trends (active only)
  const subMonthly = state.subscriptions.filter(s => s.status !== 'paused').reduce((s, sub) => s + (sub.cycle === 'monthly' ? sub.cost : sub.cycle === 'yearly' ? sub.cost/12 : sub.cycle === 'quarterly' ? sub.cost/3 : sub.cost/4.3), 0);
  destroyChart('chartAnGiveSub');
  charts.chartAnGiveSub = new Chart(document.getElementById('chartAnGiveSub'), {
    type: 'bar',
    data: { labels: months.map(getMonthLabelFromKey), datasets: [
      { label: 'Giving', data: months.map(m => getGivingTotal(m)), backgroundColor: chartColors.giving, borderRadius: 6 },
      { label: 'Subscriptions', data: months.map(() => subMonthly), backgroundColor: chartColors.secondary, borderRadius: 6 }
    ] },
    options: { ...chartDefaults, plugins: { ...chartDefaults.plugins, legend: { display: true, position: 'bottom', labels: { color: getChartLegendColor(), font: { size: 12 }, boxWidth: 12, padding: 16 } } } }
  });
}

// ============ REPORTS PAGE ============
function renderReports() {
  const period = document.getElementById('reportPeriod').value;
  const monthSelect = document.getElementById('reportMonth');
  const mk = monthSelect.value || currentMonthKey();

  // Populate month selector
  const months = getLastNMonthKeys(12);
  monthSelect.innerHTML = months.reverse().map(m => {
    const [y, mo] = m.split('-').map(Number);
    const label = new Date(y, mo, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    return `<option value="${m}" ${m === mk ? 'selected' : ''}>${label}</option>`;
  }).join('');

  const container = document.getElementById('reportContent');

  if (period === 'monthly') {
    const income = getIncomeTotal(mk);
    const expenses = getExpenseTotal(mk);
    const savings = income - expenses;
    const savingsRate = income > 0 ? Math.round((savings / income) * 100) : 0;
    const giving = getGivingTotal(mk);
    const subMonthly = state.subscriptions.filter(s => s.status !== 'paused').reduce((s, sub) => s + (sub.cycle === 'monthly' ? sub.cost : sub.cycle === 'yearly' ? sub.cost/12 : sub.cycle === 'quarterly' ? sub.cost/3 : sub.cost/4.3), 0);
    const cats = getCategoryTotals(mk, 'expense');
    const sortedCats = Object.entries(cats).sort((a,b) => b[1] - a[1]);

    // Budget breaches
    const breaches = [];
    Object.entries(state.budgets).forEach(([cat, limit]) => {
      const spent = getMonthTransactions(mk).filter(t => t.type === 'expense' && t.category === cat).reduce((s, t) => s + t.amount, 0);
      if (spent > limit) breaches.push({ cat, spent, limit, over: Math.round((spent/limit)*100 - 100) });
    });

    // Health score
    const healthScore = calculateHealthScore(mk);

    const [y, mo] = mk.split('-').map(Number);
    const label = new Date(y, mo, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    container.innerHTML = `
      <div class="card" style="margin-bottom:20px;">
        <div class="card-header"><div class="card-title">Monthly report — ${label}</div><span class="badge badge-${healthScore >= 70 ? 'success' : healthScore >= 40 ? 'warning' : 'danger'}">Health score: ${healthScore}/100</span></div>
        <div class="grid grid-4">
          <div class="metric-card"><div class="metric-label">Income</div><div class="metric-value">${fmt(income)}</div></div>
          <div class="metric-card"><div class="metric-label">Expenses</div><div class="metric-value">${fmt(expenses)}</div></div>
          <div class="metric-card"><div class="metric-label">Savings</div><div class="metric-value ${savings >= 0 ? 'metric-positive' : 'metric-negative'}">${fmt(savings)}</div></div>
          <div class="metric-card"><div class="metric-label">Savings rate</div><div class="metric-value">${savingsRate}%</div></div>
        </div>
      </div>
      <div class="grid grid-2">
        <div class="card">
          <div class="card-header"><div class="card-title">Summary</div></div>
          <div class="stat-row"><span class="stat-label">Total income</span><span class="stat-value">${fmt(income)}</span></div>
          <div class="stat-row"><span class="stat-label">Total expenses</span><span class="stat-value">${fmt(expenses)}</span></div>
          <div class="stat-row"><span class="stat-label">Total giving</span><span class="stat-value">${fmt(giving)}</span></div>
          <div class="stat-row"><span class="stat-label">Subscriptions</span><span class="stat-value">${fmt(subMonthly)}</span></div>
          <div class="stat-row"><span class="stat-label">Net savings</span><span class="stat-value">${fmt(savings)}</span></div>
          <div class="stat-row"><span class="stat-label">Largest category</span><span class="stat-value">${sortedCats[0] ? sortedCats[0][0] : '—'}</span></div>
          <div class="stat-row"><span class="stat-label">Budget breaches</span><span class="stat-value">${breaches.length > 0 ? breaches.map(b => b.cat).join(', ') : 'None'}</span></div>
        </div>
        <div class="card">
          <div class="card-header"><div class="card-title">Top categories</div></div>
          ${sortedCats.slice(0, 8).map(([cat, amt]) => `<div class="stat-row"><span class="stat-label">${cat}</span><span class="stat-value">${fmt(amt)}</span></div>`).join('')}
        </div>
      </div>
      ${breaches.length > 0 ? `<div class="card" style="margin-top:20px;">
        <div class="card-header"><div class="card-title">Budget breaches</div></div>
        ${breaches.map(b => `<div class="stat-row"><span class="stat-label">${b.cat} — ${fmt(b.spent)} / ${fmt(b.limit)}</span><span class="stat-value metric-negative">+${b.over}%</span></div>`).join('')}
      </div>` : ''}
    `;
  } else if (period === 'quarterly') {
    const monthKeys = getLastNMonthKeys(3);
    const income = monthKeys.reduce((s, m) => s + getIncomeTotal(m), 0);
    const expenses = monthKeys.reduce((s, m) => s + getExpenseTotal(m), 0);
    const giving = monthKeys.reduce((s, m) => s + getGivingTotal(m), 0);
    const savings = income - expenses;
    const savingsRate = income > 0 ? Math.round((savings / income) * 100) : 0;

    // Category growth
    const catsThis = getCategoryTotals(monthKeys[2], 'expense');
    const catsFirst = getCategoryTotals(monthKeys[0], 'expense');
    const growth = Object.keys({...catsThis, ...catsFirst}).map(cat => {
      const t = catsThis[cat] || 0;
      const f = catsFirst[cat] || 0;
      const g = f > 0 ? Math.round(((t - f) / f) * 100) : 0;
      return { cat, this: t, first: f, growth: g };
    }).filter(c => c.this > 0 || c.first > 0).sort((a,b) => b.growth - a.growth);

    container.innerHTML = `
      <div class="card" style="margin-bottom:20px;">
        <div class="card-header"><div class="card-title">Quarterly report — last 3 months</div></div>
        <div class="grid grid-4">
          <div class="metric-card"><div class="metric-label">Total income</div><div class="metric-value">${fmt(income)}</div></div>
          <div class="metric-card"><div class="metric-label">Total expenses</div><div class="metric-value">${fmt(expenses)}</div></div>
          <div class="metric-card"><div class="metric-label">Total savings</div><div class="metric-value">${fmt(savings)}</div></div>
          <div class="metric-card"><div class="metric-label">Savings rate</div><div class="metric-value">${savingsRate}%</div></div>
        </div>
      </div>
      <div class="grid grid-2">
        <div class="card">
          <div class="card-header"><div class="card-title">Three-month trends</div></div>
          <div class="stat-row"><span class="stat-label">Income (3 months)</span><span class="stat-value">${fmt(income)}</span></div>
          <div class="stat-row"><span class="stat-label">Expenses (3 months)</span><span class="stat-value">${fmt(expenses)}</span></div>
          <div class="stat-row"><span class="stat-label">Giving (3 months)</span><span class="stat-value">${fmt(giving)}</span></div>
          <div class="stat-row"><span class="stat-label">Avg monthly income</span><span class="stat-value">${fmt(income/3)}</span></div>
          <div class="stat-row"><span class="stat-label">Avg monthly expenses</span><span class="stat-value">${fmt(expenses/3)}</span></div>
          <div class="stat-row"><span class="stat-label">Avg monthly savings</span><span class="stat-value">${fmt(savings/3)}</span></div>
        </div>
        <div class="card">
          <div class="card-header"><div class="card-title">Category growth</div></div>
          ${growth.map(c => `<div class="stat-row"><span class="stat-label">${c.cat}</span><span class="stat-value ${c.growth > 0 ? 'metric-negative' : 'metric-positive'}">${c.growth > 0 ? '+' : ''}${c.growth}%</span></div>`).join('')}
        </div>
      </div>
      <div class="card" style="margin-top:20px;">
        <div class="card-header"><div class="card-title">Monthly breakdown</div></div>
        <div class="chart-container"><canvas id="chartReportTrend"></canvas></div>
      </div>
    `;
    setTimeout(() => {
      destroyChart('chartReportTrend');
      charts.chartReportTrend = new Chart(document.getElementById('chartReportTrend'), {
        type: 'bar',
        data: { labels: monthKeys.map(getMonthLabelFromKey), datasets: [
          { label: 'Income', data: monthKeys.map(m => getIncomeTotal(m)), backgroundColor: chartColors.income, borderRadius: 6 },
          { label: 'Expenses', data: monthKeys.map(m => getExpenseTotal(m)), backgroundColor: chartColors.expense, borderRadius: 6 },
          { label: 'Giving', data: monthKeys.map(m => getGivingTotal(m)), backgroundColor: chartColors.giving, borderRadius: 6 }
        ] },
        options: { ...chartDefaults, plugins: { ...chartDefaults.plugins, legend: { display: true, position: 'bottom', labels: { color: getChartLegendColor(), font: { size: 12 }, boxWidth: 12, padding: 16 } } } }
      });
    }, 50);
  } else if (period === 'annual') {
    const months = getLastNMonthKeys(12);
    const income = months.reduce((s, m) => s + getIncomeTotal(m), 0);
    const expenses = months.reduce((s, m) => s + getExpenseTotal(m), 0);
    const giving = months.reduce((s, m) => s + getGivingTotal(m), 0);
    const savings = income - expenses;
    const savingsRate = income > 0 ? Math.round((savings / income) * 100) : 0;
    const subAnnual = state.subscriptions.reduce((s, sub) => s + (sub.cycle === 'monthly' ? sub.cost*12 : sub.cycle === 'yearly' ? sub.cost : sub.cycle === 'quarterly' ? sub.cost*4 : sub.cost*52), 0);

    container.innerHTML = `
      <div class="card" style="margin-bottom:20px;">
        <div class="card-header"><div class="card-title">Annual report — last 12 months</div></div>
        <div class="grid grid-4">
          <div class="metric-card"><div class="metric-label">Total income</div><div class="metric-value">${fmt(income)}</div></div>
          <div class="metric-card"><div class="metric-label">Total expenses</div><div class="metric-value">${fmt(expenses)}</div></div>
          <div class="metric-card"><div class="metric-label">Total savings</div><div class="metric-value">${fmt(savings)}</div></div>
          <div class="metric-card"><div class="metric-label">Savings rate</div><div class="metric-value">${savingsRate}%</div></div>
        </div>
      </div>
      <div class="grid grid-2">
        <div class="card">
          <div class="card-header"><div class="card-title">Annual summary</div></div>
          <div class="stat-row"><span class="stat-label">Total income</span><span class="stat-value">${fmt(income)}</span></div>
          <div class="stat-row"><span class="stat-label">Total expenses</span><span class="stat-value">${fmt(expenses)}</span></div>
          <div class="stat-row"><span class="stat-label">Total savings</span><span class="stat-value">${fmt(savings)}</span></div>
          <div class="stat-row"><span class="stat-label">Total giving</span><span class="stat-value">${fmt(giving)}</span></div>
          <div class="stat-row"><span class="stat-label">Subscription spending</span><span class="stat-value">${fmt(subAnnual)}</span></div>
          <div class="stat-row"><span class="stat-label">Avg monthly income</span><span class="stat-value">${fmt(income/12)}</span></div>
          <div class="stat-row"><span class="stat-label">Avg monthly expenses</span><span class="stat-value">${fmt(expenses/12)}</span></div>
          <div class="stat-row"><span class="stat-label">Avg monthly savings</span><span class="stat-value">${fmt(savings/12)}</span></div>
        </div>
        <div class="card">
          <div class="card-header"><div class="card-title">Financial growth</div></div>
          <div class="chart-container"><canvas id="chartReportAnnual"></canvas></div>
        </div>
      </div>
    `;
    setTimeout(() => {
      destroyChart('chartReportAnnual');
      charts.chartReportAnnual = new Chart(document.getElementById('chartReportAnnual'), {
        type: 'line',
        data: { labels: months.map(getMonthLabelFromKey), datasets: [
          { label: 'Income', data: months.map(m => getIncomeTotal(m)), borderColor: chartColors.income, backgroundColor: 'var(--chart-fill)', fill: true, tension: 0.3, pointRadius: 3 },
          { label: 'Expenses', data: months.map(m => getExpenseTotal(m)), borderColor: chartColors.expense, backgroundColor: 'rgba(217,92,92,0.08)', fill: true, tension: 0.3, pointRadius: 3 }
        ] },
        options: { ...chartDefaults, plugins: { ...chartDefaults.plugins, legend: { display: true, position: 'bottom', labels: { color: getChartLegendColor(), font: { size: 12 }, boxWidth: 12, padding: 16 } } } }
      });
    }, 50);
  }
}

function calculateHealthScore(mk) {
  let score = 0;
  const income = getIncomeTotal(mk);
  const expenses = getExpenseTotal(mk);
  const savings = income - expenses;
  const savingsRate = income > 0 ? (savings / income) * 100 : 0;

  // Savings rate (40 points)
  if (savingsRate >= 30) score += 40;
  else if (savingsRate >= 20) score += 30;
  else if (savingsRate >= 10) score += 20;
  else if (savingsRate > 0) score += 10;

  // Budget adherence (30 points)
  const budgets = Object.entries(state.budgets);
  if (budgets.length > 0) {
    let adhered = 0;
    budgets.forEach(([cat, limit]) => {
      const spent = getMonthTransactions(mk).filter(t => t.type === 'expense' && t.category === cat).reduce((s, t) => s + t.amount, 0);
      if (spent <= limit) adhered++;
    });
    score += Math.round((adhered / budgets.length) * 30);
  } else {
    score += 15;
  }

  // Income diversification (15 points)
  const incomeCats = getCategoryTotals(mk, 'income');
  const incomeSources = Object.keys(incomeCats).length;
  if (incomeSources >= 3) score += 15;
  else if (incomeSources >= 2) score += 10;
  else if (incomeSources >= 1) score += 5;

  // Giving (15 points) - moderate giving is healthy
  const giving = getGivingTotal(mk);
  if (income > 0) {
    const givePct = (giving / income) * 100;
    if (givePct >= 5 && givePct <= 20) score += 15;
    else if (givePct > 0) score += 8;
  }

  return Math.min(100, score);
}

// ============ MODAL MANAGEMENT ============
let editingTxId = null;
let currentTxType = 'expense';

function openModal(txId) {
  editingTxId = txId || null;
  currentTxType = 'expense';
  document.getElementById('modalTitle').textContent = txId ? 'Edit transaction' : 'Add transaction';
  updateTypeSelector('expense');
  updateCategoryOptions('expense');
  populateAccountSelect('txAccount', false);
  document.getElementById('txAmount').value = '';
  document.getElementById('txDate').value = new Date().toISOString().split('T')[0];
  document.getElementById('txDescription').value = '';
  document.getElementById('txTags').value = '';
  document.getElementById('txNotes').value = '';
  document.getElementById('txPayment').value = 'Bank Transfer';
  document.getElementById('toggleRecurring').classList.remove('on');
  document.getElementById('recurringOptions').style.display = 'none';
  document.getElementById('txRecurDate').value = '';

  if (txId) {
    const tx = state.transactions.find(t => t.id === txId);
    if (tx) {
      currentTxType = tx.type;
      updateTypeSelector(tx.type);
      updateCategoryOptions(tx.type);
      updateTransferFields(tx.type);
      if (tx.type === 'transfer') {
        populateAccountSelect('txFromAccount', false);
        populateAccountSelect('txToAccount', false);
        if (tx.fromAccountId) document.getElementById('txFromAccount').value = tx.fromAccountId;
        if (tx.toAccountId) document.getElementById('txToAccount').value = tx.toAccountId;
        // fallback: accountId used to mean fromAccountId for transfers
        if (!tx.fromAccountId && tx.accountId) document.getElementById('txFromAccount').value = tx.accountId;
      } else {
        populateAccountSelect('txAccount', false);
        if (tx.accountId && document.getElementById('txAccount')) document.getElementById('txAccount').value = tx.accountId;
      }
      document.getElementById('txAmount').value = tx.amount;
      document.getElementById('txDate').value = tx.date;
      document.getElementById('txCategory').value = tx.category;
      document.getElementById('txDescription').value = tx.description;
      document.getElementById('txPayment').value = tx.payment;
      document.getElementById('txTags').value = (tx.tags || []).join(', ');
      document.getElementById('txNotes').value = tx.notes || '';
    }
  } else {
    updateTransferFields(currentTxType);
  }

  document.getElementById('modalOverlay').classList.add('active');
}

function closeModal() {
  document.getElementById('modalOverlay').classList.remove('active');
  editingTxId = null;
}

function updateTypeSelector(type) {
  document.querySelectorAll('.type-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.type === type);
  });
}

function updateCategoryOptions(type) {
  let cats;
  if (type === 'income') cats = incomeCategories;
  else if (type === 'giving') cats = givingCategories;
  else if (type === 'transfer') cats = transferCategories;
  else cats = expenseCategories;
  document.getElementById('txCategory').innerHTML = cats.map(c => '<option value="' + escapeHtml(c) + '">' + escapeHtml(c) + '</option>').join('');
}

function updateTransferFields(type) {
  const isTransfer = type === 'transfer';
  document.getElementById('txNormalAccountRow').style.display = isTransfer ? 'none' : '';
  document.getElementById('txTransferAccountRow').style.display = isTransfer ? '' : 'none';
  if (isTransfer) {
    populateAccountSelect('txFromAccount', false);
    populateAccountSelect('txToAccount', false);
  }
}

document.querySelectorAll('#typeSelector .type-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    currentTxType = btn.dataset.type;
    updateTypeSelector(currentTxType);
    updateCategoryOptions(currentTxType);
    updateTransferFields(currentTxType);
  });
});

function saveTransaction() {
  const amount = parseFloat(document.getElementById('txAmount').value);
  if (!amount || amount <= 0) { showToast('Enter a valid amount'); return; }
  const date = document.getElementById('txDate').value;
  if (!date) { showToast('Select a date'); return; }
  const category = document.getElementById('txCategory').value;
  const description = document.getElementById('txDescription').value || category;
  const payment = document.getElementById('txPayment').value;
  const tagsStr = document.getElementById('txTags').value;
  const tags = tagsStr ? tagsStr.split(',').map(t => t.trim()).filter(Boolean) : [];
  const notes = document.getElementById('txNotes').value;

  let txData;
  if (currentTxType === 'transfer') {
    const fromAccountId = document.getElementById('txFromAccount').value || null;
    const toAccountId = document.getElementById('txToAccount').value || null;
    if (fromAccountId && toAccountId && fromAccountId === toAccountId) { showToast('From and To accounts must be different'); return; }
    if (!fromAccountId || !toAccountId) { showToast('Select both From and To accounts'); return; }
    txData = { id: editingTxId || uid(), date, amount, type: currentTxType, category, description, payment, fromAccountId, toAccountId, accountId: fromAccountId, tags, notes };
  } else {
    const accountId = document.getElementById('txAccount').value || null;
    txData = { id: editingTxId || uid(), date, amount, type: currentTxType, category, description, payment, accountId, tags, notes };
  }

  const isRecurring = document.getElementById('toggleRecurring').classList.contains('on');

  if (editingTxId) {
    const idx = state.transactions.findIndex(t => t.id === editingTxId);
    if (idx >= 0) {
      const oldTx = state.transactions[idx];
      // Reverse old balance effects
      if (oldTx.type === 'income') state.balance -= oldTx.amount;
      else if (oldTx.type === 'expense' || oldTx.type === 'giving') state.balance += oldTx.amount;
      else if (oldTx.type === 'transfer') { /* transfer has no net effect on total balance */ }
      if (oldTx.type === 'transfer') {
        // Reverse old transfer: add back to from account, subtract from to account
        const oldFrom = state.accounts.find(a => a.id === (oldTx.fromAccountId || oldTx.accountId));
        const oldTo = state.accounts.find(a => a.id === oldTx.toAccountId);
        if (oldFrom) oldFrom.balance += oldTx.amount;
        if (oldTo) oldTo.balance -= oldTx.amount;
      } else if (oldTx.accountId) {
        const oldAcct = state.accounts.find(a => a.id === oldTx.accountId);
        if (oldAcct) {
          if (oldTx.type === 'income') oldAcct.balance -= oldTx.amount;
          else if (oldTx.type === 'expense' || oldTx.type === 'giving') oldAcct.balance += oldTx.amount;
        }
      }
      state.transactions[idx] = txData;
    }
    showToast('Transaction updated');
  } else {
    state.transactions.push(txData);
    showToast('Transaction added');
  }
  // Apply new balance effects
  if (currentTxType === 'income') state.balance += amount;
  else if (currentTxType === 'expense' || currentTxType === 'giving') state.balance -= amount;
  else if (currentTxType === 'transfer') { /* transfer has no net effect on total balance */ }
  if (currentTxType === 'transfer') {
    const fromAcct = state.accounts.find(a => a.id === txData.fromAccountId);
    const toAcct = state.accounts.find(a => a.id === txData.toAccountId);
    if (fromAcct) fromAcct.balance -= amount;
    if (toAcct) toAcct.balance += amount;
  } else if (txData.accountId) {
    const acct = state.accounts.find(a => a.id === txData.accountId);
    if (acct) {
      if (currentTxType === 'income') acct.balance += amount;
      else if (currentTxType === 'expense' || currentTxType === 'giving') acct.balance -= amount;
    }
  }

  if (isRecurring && !editingTxId) {
    const recurFreq = document.getElementById('txRecurFreq').value;
    const recurDate = document.getElementById('txRecurDate').value || addDays(new Date(date), 30);
    const recurEvent = {
      id: uid(),
      name: description,
      amount: amount,
      frequency: recurFreq,
      nextDate: recurDate,
      category: category,
      syncToGcal: false,
      gcalEventId: null,
      active: true,
      isRecurringTx: true,
      txType: currentTxType,
      payment: payment
    };
    if (!state.incomeEvents) state.incomeEvents = [];
    state.incomeEvents.push(recurEvent);
    refreshFinancialEvents();
    showToast('Recurring transaction scheduled');
  }

  saveData();
  closeModal();
  // Re-render current page
  const activePage = document.querySelector('.page.active').id.replace('page-', '');
  navigate(activePage);
}

function editTransaction(id) { openModal(id); }

function deleteTransaction(id) {
  const tx = state.transactions.find(t => t.id === id);
  if (!tx) return;
  confirmDelete('Delete transaction?', 'Are you sure you want to delete this transaction? "' + tx.description + '" for ' + fmt(tx.amount) + '.', () => {
    if (tx.type === 'income') state.balance -= tx.amount;
    else if (tx.type === 'expense' || tx.type === 'giving') state.balance += tx.amount;
    // Also update account balance if accountId exists
    if (tx.type === 'transfer') {
      const fromAcct = state.accounts.find(a => a.id === (tx.fromAccountId || tx.accountId));
      const toAcct = state.accounts.find(a => a.id === tx.toAccountId);
      if (fromAcct) fromAcct.balance += tx.amount;
      if (toAcct) toAcct.balance -= tx.amount;
    } else if (tx.accountId) {
      const acct = state.accounts.find(a => a.id === tx.accountId);
      if (acct) {
        if (tx.type === 'income') acct.balance -= tx.amount;
        else if (tx.type === 'expense' || tx.type === 'giving') acct.balance += tx.amount;
      }
    }
    state.transactions = state.transactions.filter(t => t.id !== id);
    saveData();
    showUndoToast('Transaction deleted', () => {
      state.transactions.push(tx);
      if (tx.type === 'income') state.balance += tx.amount;
      else if (tx.type === 'expense' || tx.type === 'giving') state.balance -= tx.amount;
      if (tx.type === 'transfer') {
        const fromAcct = state.accounts.find(a => a.id === (tx.fromAccountId || tx.accountId));
        const toAcct = state.accounts.find(a => a.id === tx.toAccountId);
        if (fromAcct) fromAcct.balance -= tx.amount;
        if (toAcct) toAcct.balance += tx.amount;
      } else if (tx.accountId) {
        const acct = state.accounts.find(a => a.id === tx.accountId);
        if (acct) {
          if (tx.type === 'income') acct.balance += tx.amount;
          else if (tx.type === 'expense' || tx.type === 'giving') acct.balance -= tx.amount;
        }
      }
      saveData();
      const ap = document.querySelector('.page.active').id.replace('page-',''); navigate(ap);
    });
    const activePage = document.querySelector('.page.active').id.replace('page-', '');
    navigate(activePage);
  });
}

// Subscription modal
function openSubModal() {
  renderSubLogoSelector();
  document.getElementById('subModalOverlay').classList.add('active');
}
function closeSubModal() {
  document.getElementById('subModalOverlay').classList.remove('active');
  selectedSubLogo = '';
  document.getElementById('subLogoPreview').style.display = 'none';
  document.getElementById('subLogoUpload').value = '';
}

function saveSubscription() {
  const name = document.getElementById('subName').value;
  const cost = parseFloat(document.getElementById('subCost').value);
  if (!name || !cost) { showToast('Enter name and cost'); return; }
  const syncToGcal = document.getElementById('toggleSubGcal').classList.contains('on');
  const isActive = document.getElementById('toggleSubActive').classList.contains('on');
  const sub = {
    id: uid(), name, cost,
    cycle: document.getElementById('subCycle').value,
    renewal: document.getElementById('subRenewal').value || addDays(new Date(), 30),
    category: document.getElementById('subCategory').value,
    notes: document.getElementById('subNotes').value,
    status: isActive ? 'active' : 'paused',
    logo: selectedSubLogo,
    syncToGcal: syncToGcal,
    gcalEventId: null
  };
  state.subscriptions.push(sub);
  refreshFinancialEvents();
  if (syncToGcal && state.settings.googleCalendar.connected) syncSubscriptionToGcal(sub);
  saveData();
  closeSubModal();
  showToast('Subscription added');
  renderSubscriptions();
  ['subName','subCost','subRenewal','subNotes'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('toggleSubGcal').classList.remove('on');
  document.getElementById('toggleSubActive').classList.add('on');
  document.getElementById('subLogoPreview').style.display = 'none';
  document.getElementById('subLogoUpload').value = '';
  selectedSubLogo = '';
  renderSubLogoSelector();
}

function deleteSubscription(id) {
  const sub = state.subscriptions.find(s => s.id === id);
  if (!sub) return;
  confirmDelete('Delete subscription?', 'Are you sure you want to delete \"' + sub.name + '\" (' + fmt(sub.cost) + ' / ' + sub.cycle + ')?', () => {
    if (sub.gcalEventId && state.settings.googleCalendar.connected) deleteGcalEvent(sub.gcalEventId);
    state.subscriptions = state.subscriptions.filter(s => s.id !== id);
    refreshFinancialEvents();
    saveData();
    showUndoToast('Subscription removed', () => {
      state.subscriptions.push(sub);
      refreshFinancialEvents();
      saveData();
      renderSubscriptions();
    });
    renderSubscriptions();
  });
}

let selectedBudgetIcon = '';

function getBudgetCategoryOptions(selectedCat) {
  const existingCustom = Object.keys(state.budgets).filter(c => !expenseCategories.includes(c));
  let options = expenseCategories.map(c => `<option value="${c}" ${c === selectedCat ? 'selected' : ''}>${c}</option>`);
  existingCustom.forEach(c => {
    if (c !== selectedCat) options.push(`<option value="${c}">${c}</option>`);
    else options.push(`<option value="${c}" selected>${c}</option>`);
  });
  options.push(`<option value="__custom__" ${selectedCat === '__custom__' ? 'selected' : ''}>Other (custom)</option>`);
  return options.join('');
}

function onBudgetCategoryChange() {
  const select = document.getElementById('budgetCategory');
  const val = select.value;
  const isCustom = val === '__custom__' || (!expenseCategories.includes(val) && val !== '');
  document.getElementById('budgetCustomWrap').style.display = isCustom ? 'block' : 'none';
  document.getElementById('budgetIconWrap').style.display = isCustom ? 'block' : 'none';
  if (isCustom) {
    const preselect = state.budgetIcons[val] || '';
    renderBudgetIconSelector(preselect);
    if (val !== '__custom__') {
      document.getElementById('budgetCustomName').value = val;
    }
  }
}

function renderBudgetIconSelector(preselect) {
  const container = document.getElementById('budgetIconSelector');
  const iconKeys = Object.keys(categoryIcons);
  selectedBudgetIcon = preselect || iconKeys[0];
  container.innerHTML = iconKeys.map(key => {
    const isSel = key === selectedBudgetIcon;
    return `<div class="budget-icon-chip ${isSel ? 'selected' : ''}" onclick="selectBudgetIcon(this,'${key}')">${categoryIcons[key]}<span>${key}</span></div>`;
  }).join('');
}

function selectBudgetIcon(el, key) {
  selectedBudgetIcon = key;
  document.querySelectorAll('#budgetIconSelector .budget-icon-chip').forEach(c => c.classList.remove('selected'));
  el.classList.add('selected');
}

// Budget modal
function openBudgetModal() {
  const select = document.getElementById('budgetCategory');
  select.innerHTML = getBudgetCategoryOptions();
  document.getElementById('budgetCustomName').value = '';
  document.getElementById('budgetCustomWrap').style.display = 'none';
  document.getElementById('budgetIconWrap').style.display = 'none';
  document.getElementById('budgetLimit').value = '';
  selectedBudgetIcon = '';
  document.getElementById('budgetModalOverlay').classList.add('active');
}
function closeBudgetModal() { document.getElementById('budgetModalOverlay').classList.remove('active'); }

function toggleBudgetDetails(id) {
  const el = document.getElementById(id);
  if (!el) return;
  const isHidden = el.style.display === 'none';
  el.style.display = isHidden ? 'block' : 'none';
}

function toggleGoalDetails(id) {
  const el = document.getElementById(id);
  if (!el) return;
  const isHidden = el.style.display === 'none';
  el.style.display = isHidden ? 'block' : 'none';
}

function editBudget(cat) {
  const select = document.getElementById('budgetCategory');
  select.innerHTML = getBudgetCategoryOptions(cat);
  document.getElementById('budgetLimit').value = state.budgets[cat] || '';
  onBudgetCategoryChange();
  document.getElementById('budgetModalOverlay').classList.add('active');
}

function deleteBudget(cat) {
  confirmDelete('Delete budget?', 'Are you sure you want to delete the monthly budget for "' + cat + '" (' + fmt(state.budgets[cat]) + ')?', () => {
    delete state.budgets[cat];
    delete state.budgetIcons[cat];
    saveData();
    showToast('Budget deleted');
    renderBudgets();
  });
}

function saveBudget() {
  let cat = document.getElementById('budgetCategory').value;
  const limit = parseFloat(document.getElementById('budgetLimit').value);
  if (!cat || !limit) { showToast('Enter category and limit'); return; }

  // Handle custom category
  if (cat === '__custom__') {
    cat = document.getElementById('budgetCustomName').value.trim();
    if (!cat) { showToast('Enter a custom category name'); return; }
  }

  // Store icon for custom categories
  if (!expenseCategories.includes(cat) && selectedBudgetIcon) {
    state.budgetIcons[cat] = selectedBudgetIcon;
  }

  state.budgets[cat] = limit;
  saveData();
  closeBudgetModal();
  showToast('Budget saved');
  renderBudgets();
}

const goalIconOptions = ['Savings','Investment','Shield','Sun','Monitor','Plane','Smartphone','Home','Camera','Gift','Briefcase','Education','Health','Rent','Shopping','Transportation','Entertainment','Food','Business','Miscellaneous'];
let selectedGoalIcon = 'Savings';

function renderGoalIconSelector(preselect) {
  const container = document.getElementById('goalIconSelector');
  selectedGoalIcon = preselect || 'Savings';
  container.innerHTML = goalIconOptions.map(key => {
    const isSel = key === selectedGoalIcon;
    return `<div style="text-align:center;"><div class="goal-icon-chip ${isSel ? 'selected' : ''}" onclick="selectGoalIcon(this,'${key}')">${categoryIcons[key]}</div><div class="goal-icon-label">${key}</div></div>`;
  }).join('');
}

function selectGoalIcon(el, key) {
  selectedGoalIcon = key;
  document.querySelectorAll('#goalIconSelector .goal-icon-chip').forEach(c => c.classList.remove('selected'));
  el.classList.add('selected');
}

function getGoalIcon(goal) {
  if (goal.icon && categoryIcons[goal.icon]) return categoryIcons[goal.icon];
  // Fallback: suggest icon based on name
  const name = (goal.name || '').toLowerCase();
  if (name.includes('emergency')) return categoryIcons['Shield'];
  if (name.includes('vacation') || name.includes('holiday') || name.includes('travel')) return categoryIcons['Plane'] || categoryIcons['Sun'];
  if (name.includes('laptop') || name.includes('computer') || name.includes('phone') || name.includes('tech')) return categoryIcons['Monitor'] || categoryIcons['Smartphone'];
  if (name.includes('invest')) return categoryIcons['Investment'];
  if (name.includes('car') || name.includes('vehicle') || name.includes('bike')) return categoryIcons['Transportation'];
  if (name.includes('house') || name.includes('home') || name.includes('rent')) return categoryIcons['Home'] || categoryIcons['Rent'];
  if (name.includes('wedding') || name.includes('marriage')) return categoryIcons['Giving'];
  if (name.includes('education') || name.includes('school') || name.includes('course')) return categoryIcons['Education'];
  if (name.includes('health') || name.includes('medical')) return categoryIcons['Health'];
  return categoryIcons['Savings'];
}

// Goal modal
function openGoalModal() {
  ['goalName','goalTarget','goalCurrent','goalDate'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('goalPriority').value = 'medium';
  renderGoalIconSelector('Savings');
  document.getElementById('goalModalOverlay').classList.add('active');
}
function closeGoalModal() { document.getElementById('goalModalOverlay').classList.remove('active'); }

function saveGoal() {
  const name = document.getElementById('goalName').value;
  const target = parseFloat(document.getElementById('goalTarget').value);
  const current = parseFloat(document.getElementById('goalCurrent').value) || 0;
  const date = document.getElementById('goalDate').value || addDays(new Date(), 365);
  const priority = document.getElementById('goalPriority').value;
  if (!name || !target) { showToast('Enter name and target'); return; }
  state.goals.push({ id: uid(), name, target, current, date, priority, icon: selectedGoalIcon, contributions: [] });
  saveData();
  closeGoalModal();
  showToast('Goal created');
  renderGoals();
}

function deleteGoal(id) {
  const goal = state.goals.find(g => g.id === id);
  if (!goal) return;
  confirmDelete('Delete savings goal?', 'Are you sure you want to delete \"' + goal.name + '\"? ' + fmt(goal.current) + ' has been saved toward this goal.', () => {
    state.goals = state.goals.filter(g => g.id !== id);
    saveData();
    showUndoToast('Goal deleted', () => {
      state.goals.push(goal);
      saveData();
      renderGoals();
    });
    renderGoals();
  });
}

// Contribution modal
let contribGoalId = null;
function openContribModal(goalId) {
  contribGoalId = goalId;
  const goal = state.goals.find(g => g.id === goalId);
  document.getElementById('contribGoalName').value = goal ? goal.name : '';
  document.getElementById('contribAmount').value = '';
  const sourceSelect = document.getElementById('contribSource');
  let opts = '<option value="">Select source...</option>';
  state.accounts.forEach(a => { opts += `<option value="account:${a.id}">${a.name}</option>`; });
  opts += '<option value="custom">Other (custom)</option>';
  sourceSelect.innerHTML = opts;
  document.getElementById('contribCustomSourceWrap').style.display = 'none';
  document.getElementById('contribCustomSource').value = '';
  document.getElementById('contribModalOverlay').classList.add('active');
}
function closeContribModal() { document.getElementById('contribModalOverlay').classList.remove('active'); contribGoalId = null; }
function onContribSourceChange() {
  const val = document.getElementById('contribSource').value;
  document.getElementById('contribCustomSourceWrap').style.display = (val === 'custom') ? '' : 'none';
}

function saveContribution() {
  const amount = parseFloat(document.getElementById('contribAmount').value);
  if (!amount || amount <= 0) { showToast('Enter a valid amount'); return; }
  const sourceVal = document.getElementById('contribSource').value;
  if (!sourceVal) { showToast('Select a source for this contribution'); return; }
  let sourceType = 'custom';
  let sourceId = '';
  let sourceName = '';
  if (sourceVal.startsWith('account:')) {
    sourceType = 'account';
    sourceId = sourceVal.replace('account:', '');
    const acct = state.accounts.find(a => a.id === sourceId);
    if (!acct) { showToast('Account not found'); return; }
    sourceName = acct.name;
    if (acct.balance < amount) { showToast('Insufficient balance in ' + acct.name); return; }
    acct.balance -= amount;
    // Also deduct from total balance
    state.balance -= amount;
  } else {
    sourceName = document.getElementById('contribCustomSource').value.trim() || 'Custom';
  }
  const goal = state.goals.find(g => g.id === contribGoalId);
  if (goal) {
    goal.current += amount;
    goal.contributions = goal.contributions || [];
    const now = new Date();
    goal.contributions.push({ date: now.toISOString().split('T')[0], time: now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }), timestamp: now.toISOString(), amount, sourceType, sourceId, sourceName });
    saveData();
    showToast('Contribution added');
    closeContribModal();
    renderGoals();
  }
}

function toggleContribHistory(listId, el) {
  const list = document.getElementById(listId);
  if (!list) return;
  const isHidden = list.style.display === 'none';
  list.style.display = isHidden ? 'block' : 'none';
  el.classList.toggle('open', isHidden);
}

// Export
function exportData() {
  const headers = ['Date','Type','Category','Description','Amount','Payment Method','Tags','Notes'];
  const rows = state.transactions.map(t => [
    t.date, t.type, t.category, `"${(t.description||'').replace(/"/g,'""')}"`, t.amount, t.payment || '', `"${(t.tags||[]).join(';')}"`, `"${(t.notes||'').replace(/"/g,'""')}"`
  ]);
  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `finance-export-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('Transactions exported to CSV');
}
window.exportData = exportData;

function recordBackup() {
  const now = new Date().toISOString();
  localStorage.setItem('finance_os_last_backup', now);
  updateLastBackupUI();
}

function updateLastBackupUI() {
  const el = document.getElementById('lastBackupTime');
  const wrap = document.getElementById('lastBackupDesc');
  if (!el || !wrap) return;
  const raw = localStorage.getItem('finance_os_last_backup');
  if (raw) {
    const d = new Date(raw);
    const diff = Date.now() - d.getTime();
    let text;
    if (diff < 60000) text = 'just now';
    else if (diff < 3600000) text = Math.floor(diff/60000) + ' min ago';
    else if (diff < 86400000) text = Math.floor(diff/3600000) + ' hr ago';
    else text = Math.floor(diff/86400000) + ' days ago';
    el.textContent = text;
    wrap.style.display = 'inline';
  }
}

// Toast
function showToast(msg) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.className = 'toast show';
  toast.onclick = null;
  setTimeout(() => toast.classList.remove('show'), 2500);
}

let undoTimer = null;
let currentUndoFn = null;
function showUndoToast(msg, undoFn) {
  const toast = document.getElementById('toast');
  currentUndoFn = undoFn;
  toast.innerHTML = msg + ' <button id="undoBtn" style="margin-left:10px;background:rgba(255,255,255,0.2);border:1px solid rgba(255,255,255,0.3);color:white;padding:2px 12px;border-radius:6px;cursor:pointer;font-weight:600;font-size:13px;">Undo</button>';
  toast.className = 'toast show';
  toast.style.cursor = 'default';
  toast.onclick = null;
  const btn = document.getElementById('undoBtn');
  if (btn) {
    btn.onclick = (e) => {
      e.stopPropagation();
      e.preventDefault();
      if (currentUndoFn) {
        try { currentUndoFn(); } catch(err) { console.error('Undo failed', err); }
        currentUndoFn = null;
      }
      toast.classList.remove('show');
      if (undoTimer) clearTimeout(undoTimer);
    };
  }
  if (undoTimer) clearTimeout(undoTimer);
  undoTimer = setTimeout(() => { toast.classList.remove('show'); currentUndoFn = null; }, 5000);
}

let confirmDeleteId = 0;
function confirmDelete(title, message, onConfirm) {
  confirmDeleteId++;
  const overlayId = 'confirm-delete-' + confirmDeleteId;
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay active';
  overlay.id = overlayId;
  overlay.style.zIndex = '300';
  overlay.innerHTML = '<div class="modal" style="max-width:400px;"><div class="modal-header"><div class="modal-title" style="color:var(--danger);">' + title + '</div><button class="modal-close" onclick="document.getElementById(\''+overlayId+'\').remove()">&times;</button></div><div class="modal-body"><p style="font-size:14px;color:var(--text-secondary);line-height:1.6;margin-bottom:8px;">' + message + '</p><p style="font-size:13px;color:var(--text-tertiary);">This action cannot be undone.</p></div><div class="modal-footer"><button class="btn" onclick="document.getElementById(\''+overlayId+'\').remove()">Cancel</button><button class="btn btn-danger" id="confirmDeleteBtn-'+overlayId+'">Delete</button></div></div>';
  document.body.appendChild(overlay);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
  document.getElementById('confirmDeleteBtn-'+overlayId).onclick = () => { overlay.remove(); onConfirm(); };
}

// Close modals on overlay click
document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      overlay.classList.remove('active');
    }
  });
});

// Keyboard: Enter to save in transaction modal
// Recurring toggle handler
document.getElementById('toggleRecurring').addEventListener('click', function() {
  document.getElementById('recurringOptions').style.display = this.classList.contains('on') ? 'block' : 'none';
});
document.getElementById('modalOverlay').addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && e.ctrlKey) saveTransaction();
});

document.getElementById('eventDetailModalOverlay').addEventListener('click', (e) => {
  if (e.target === e.currentTarget) closeEventDetailModal();
});
document.getElementById('incomeEventModalOverlay').addEventListener('click', (e) => {
  if (e.target === e.currentTarget) closeIncomeEventModal();
});

// ============ FINANCIAL EVENTS ENGINE ============

function generateFinancialEvents() {
  // Preserve manual events already in state
  const manualEvents = (state.financialEvents || []).filter(e => e.sourceType === 'manual');
  const events = [...manualEvents];
  state.subscriptions.forEach(sub => {
    if (sub._cancelled || sub.status === 'paused') return;
    const nextDates = getFutureDates(sub.renewal, sub.cycle, 3);
    nextDates.forEach(dateStr => {
      events.push({ id: uid(), type: 'subscription', title: sub.name + ' renewal', amount: sub.cost, category: sub.category, date: dateStr, recurrence: sub.cycle, status: getEventStatus(dateStr), syncToGcal: sub.syncToGcal || false, gcalEventId: sub.gcalEventId || null, sourceId: sub.id, sourceType: 'subscription', linkedTxId: null, reminderDays: null });
    });
  });
  state.incomeEvents.forEach(inc => {
    if (!inc.active) return;
    const nextDates = getFutureDates(inc.nextDate, inc.frequency, 3);
    nextDates.forEach(dateStr => {
      events.push({ id: uid(), type: 'income', title: inc.name, amount: inc.amount, category: inc.category, date: dateStr, recurrence: inc.frequency, status: getEventStatus(dateStr), syncToGcal: inc.syncToGcal || false, gcalEventId: inc.gcalEventId || null, sourceId: inc.id, sourceType: 'income', linkedTxId: null, reminderDays: null, accountId: inc.accountId || null });
    });
  });
  if (state.settings.syncGoals) {
    state.goals.forEach(goal => {
      if (goal.current >= goal.target) return;
      events.push({ id: uid(), type: 'savings', title: goal.name + ' deadline', amount: goal.target - goal.current, category: 'Savings', date: goal.date, recurrence: 'one-time', status: getEventStatus(goal.date), syncToGcal: false, gcalEventId: null, sourceId: goal.id, sourceType: 'goal', linkedTxId: null, reminderDays: null });
    });
  }
  return events.sort((a,b) => new Date(a.date) - new Date(b.date));
}

function getEventStatus(dateStr) {
  const today = new Date(); today.setHours(0,0,0,0);
  const eventDate = new Date(dateStr); eventDate.setHours(0,0,0,0);
  const diff = eventDate - today;
  if (diff < 0) return 'missed';
  if (diff === 0) return 'due-today';
  return 'upcoming';
}

function getFutureDates(startDateStr, frequency, count) {
  const dates = [];
  let current = new Date(startDateStr);
  const today = new Date(); today.setHours(0,0,0,0);
  for (let i = 0; i < count; i++) {
    while (current < today) { current = advanceDate(current, frequency); }
    dates.push(current.toISOString().split('T')[0]);
    current = advanceDate(current, frequency);
  }
  return dates;
}

function advanceDate(date, frequency) {
  const d = new Date(date);
  switch(frequency) {
    case 'weekly': d.setDate(d.getDate() + 7); break;
    case 'monthly': d.setMonth(d.getMonth() + 1); break;
    case 'quarterly': d.setMonth(d.getMonth() + 3); break;
    case 'yearly': d.setFullYear(d.getFullYear() + 1); break;
  }
  return d;
}

function autoPostRecurring() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let postedCount = 0;
  const postedNames = [];

  // Post subscriptions (expenses)
  state.subscriptions.forEach(sub => {
    if (sub.status === 'paused') return;
    if (!sub.postedDates) sub.postedDates = [];

    let safety = 0;
    while (safety < 50) {
      safety++;
      const currentDate = new Date(sub.renewal);
      currentDate.setHours(0, 0, 0, 0);
      if (currentDate > today) break;

      const dateStr = sub.renewal;
      if (!sub.postedDates.includes(dateStr)) {
        const tx = {
          id: uid(),
          date: dateStr,
          type: 'expense',
          category: sub.category || 'Subscriptions',
          description: sub.name + ' subscription',
          amount: sub.cost,
          payment: 'Bank Transfer',
          tags: ['recurring', 'auto-posted'],
          notes: 'Auto-posted from recurring subscription',
          accountId: sub.accountId || null
        };
        state.transactions.push(tx);
        state.balance -= sub.cost;
        if (sub.accountId) {
          const acct = state.accounts.find(a => a.id === sub.accountId);
          if (acct) acct.balance -= sub.cost;
        }
        sub.postedDates.push(dateStr);
        postedCount++;
        postedNames.push(sub.name);
      }
      const nextDate = advanceDate(currentDate, sub.cycle);
      const nextStr = nextDate.toISOString().split('T')[0];
      if (nextStr === sub.renewal) break; // safeguard: no advancement
      sub.renewal = nextStr;
    }
  });

  // Post income events
  state.incomeEvents.forEach(inc => {
    if (!inc.active) return;
    if (!inc.postedDates) inc.postedDates = [];

    let safety = 0;
    while (safety < 50) {
      safety++;
      const currentDate = new Date(inc.nextDate);
      currentDate.setHours(0, 0, 0, 0);
      if (currentDate > today) break;

      const dateStr = inc.nextDate;
      if (!inc.postedDates.includes(dateStr)) {
        const tx = {
          id: uid(),
          date: dateStr,
          type: 'income',
          category: inc.category || 'Income',
          description: inc.name,
          amount: inc.amount,
          payment: 'Bank Transfer',
          tags: ['recurring', 'auto-posted'],
          notes: 'Auto-posted from recurring income event',
          accountId: inc.accountId || null
        };
        state.transactions.push(tx);
        state.balance += inc.amount;
        if (inc.accountId) {
          const acct = state.accounts.find(a => a.id === inc.accountId);
          if (acct) acct.balance += inc.amount;
        }
        inc.postedDates.push(dateStr);
        postedCount++;
        postedNames.push(inc.name);
      }
      const nextDate = advanceDate(currentDate, inc.frequency);
      const nextStr = nextDate.toISOString().split('T')[0];
      if (nextStr === inc.nextDate) break; // safeguard: no advancement
      inc.nextDate = nextStr;
    }
  });

  if (postedCount > 0) {
    state.transactions.sort((a, b) => new Date(a.date) - new Date(b.date));
    saveData();
    refreshFinancialEvents();
    const unique = [...new Set(postedNames)];
    if (unique.length === 1) {
      const count = postedNames.filter(n => n === unique[0]).length;
      showToast(unique[0] + ' posted ' + count + '× today');
    } else {
      showToast(postedCount + ' recurring items auto-posted');
    }
  }
}
window.autoPostRecurring = autoPostRecurring;

function refreshFinancialEvents() {
  state.financialEvents = generateFinancialEvents();
  saveData();
}

function getUpcomingEvents(limit) {
  refreshFinancialEvents();
  const today = new Date(); today.setHours(0,0,0,0);
  return state.financialEvents.filter(e => e.status !== 'completed' && e.status !== 'cancelled' && new Date(e.date) >= today).sort((a,b) => new Date(a.date) - new Date(b.date)).slice(0, limit || 8);
}

function getEventTypeColor(type) {
  if (type === 'income') return 'income';
  if (type === 'expense' || type === 'subscription' || type === 'bill' || type === 'custom') return 'expense';
  if (type === 'savings') return 'savings';
  return 'neutral';
}

// ============ DASHBOARD UPCOMING & NOTIFICATIONS ============

function renderDashboardUpcoming() {
  const container = document.getElementById('dashUpcoming');
  const events = getUpcomingEvents(6);
  if (events.length === 0) { container.innerHTML = '<div class="empty-state">No upcoming financial events</div>'; return; }
  container.innerHTML = events.map(e => {
    const d = new Date(e.date);
    const day = d.getDate();
    const month = d.toLocaleDateString('en-US', { month: 'short' });
    const colorClass = getEventTypeColor(e.type);
    const sign = e.type === 'income' ? '+' : '\u2212';
    const amtColor = e.type === 'income' ? 'income' : 'expense';
    const statusBadge = e.status === 'due-today' ? '<span class="event-status due-today" style="margin-left:4px;">Due today</span>' : '';
    return '<div class="upcoming-item" onclick="openEventDetail(\''+e.id+'\')"><div class="upcoming-date"><div class="upcoming-date-day">'+day+'</div><div class="upcoming-date-month">'+month+'</div></div><div class="event-dot '+colorClass+'"></div><div class="event-info"><div class="event-title">'+e.title+statusBadge+'</div><div class="event-meta">'+e.category+' \u00b7 '+fmtDate(e.date)+'</div></div><div class="event-amount '+amtColor+'">'+sign+fmt(e.amount)+'</div></div>';
  }).join('');
}

function renderDashboardNotifications() {
  const container = document.getElementById('dashNotifications');
  if (!state.settings.notifications) { container.innerHTML = ''; return; }
  const win = state.settings.notifWindow || 7;
  const today = new Date(); today.setHours(0,0,0,0);
  const events = state.financialEvents.filter(e => {
    if (e.status === 'completed' || e.status === 'cancelled') return false;
    const ed = new Date(e.date); ed.setHours(0,0,0,0);
    const diff = Math.ceil((ed - today) / 86400000);
    return diff >= 0 && diff <= win;
  });
  if (events.length === 0) { container.innerHTML = ''; return; }
  const totalOut = events.filter(e => e.type !== 'income').reduce((s,e) => s + e.amount, 0);
  const totalIn = events.filter(e => e.type === 'income').reduce((s,e) => s + e.amount, 0);
  const dueToday = events.filter(e => e.status === 'due-today');
  const dueTomorrow = events.filter(e => { const ed = new Date(e.date); ed.setHours(0,0,0,0); return Math.ceil((ed - today) / 86400000) === 1; });
  const notifs = [];
  if (dueToday.length > 0) notifs.push('<strong>'+dueToday.length+'</strong> financial event'+(dueToday.length > 1 ? 's' : '')+' due today \u2014 '+dueToday.map(e => e.title).join(', ')+'.');
  if (dueTomorrow.length > 0) { const exp = dueTomorrow.filter(e => e.type !== 'income'); if (exp.length > 0) notifs.push('Your '+exp[0].title+' of '+fmt(exp[0].amount)+' is due tomorrow.'); }
  notifs.push('You have <strong>'+fmt(totalOut)+'</strong> in scheduled payments and <strong>'+fmt(totalIn)+'</strong> in expected income in the next '+win+' days.');
  container.innerHTML = notifs.map((text, i) => '<div class="notif-banner" id="notif-'+i+'"><div class="notif-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg></div><div class="notif-text">'+text+'</div><button class="notif-dismiss" onclick="dismissNotif(\'notif-'+i+'\')">&times;</button></div>').join('');
}

function dismissNotif(id) { const el = document.getElementById(id); if (el) el.style.display = 'none'; }

// ============ FINANCIAL CALENDAR ============

let calCurrentDate = new Date();
let calViewMode = 'month';

function renderCalendar() {
  document.getElementById('calTitle').textContent = calGetTitle();
  const content = document.getElementById('calContent');
  refreshFinancialEvents();
  if (calViewMode === 'month') content.innerHTML = calRenderMonth();
  else if (calViewMode === 'week') content.innerHTML = calRenderWeek();
  else if (calViewMode === 'all') content.innerHTML = calRenderAllEvents();
  else content.innerHTML = calRenderDay();
  renderCalSidebar();
}

function calShowAllEvents() {
  calViewMode = 'all';
  document.querySelectorAll('.cal-view-btn').forEach(b => b.classList.remove('active'));
  renderCalendar();
}

function calRenderAllEvents() {
  refreshFinancialEvents();
  const events = [...state.financialEvents].filter(e => e.status !== 'cancelled').sort((a,b) => new Date(a.date) - new Date(b.date));
  let html = '<div class="cal-day-view">';
  html += '<button class="cal-create-btn" onclick="calSetView(\'month\')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>&nbsp;Back to calendar</button>';
  if (events.length === 0) {
    html += '<div class="empty-state">No financial events</div>';
  } else {
    const grouped = {};
    events.forEach(e => {
      const key = e.date.substring(0, 7);
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(e);
    });
    const sortedKeys = Object.keys(grouped).sort();
    sortedKeys.forEach(key => {
      const [y, m] = key.split('-').map(Number);
      const monthLabel = new Date(y, m, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      html += '<div style="font-size:14px;font-weight:600;color:var(--text-secondary);margin:16px 0 8px;padding-bottom:6px;border-bottom:1px solid var(--border);">' + monthLabel + '</div>';
      html += grouped[key].map(e => {
        const cls = getEventTypeColor(e.type);
        const sign = e.type === 'income' ? '+' : '\u2212';
        const amtCls = e.type === 'income' ? 'income' : 'expense';
        const statusBadge = e.status ? '<span class="event-status ' + e.status + '">' + e.status.replace('-', ' ') + '</span>' : '';
        return '<div class="event-item" onclick="openEventDetail(\'' + e.id + '\')"><div class="event-dot ' + cls + '"></div><div class="event-info"><div class="event-title">' + e.title + '</div><div class="event-meta">' + e.category + ' \u00b7 ' + fmtDate(e.date) + ' \u00b7 ' + (e.recurrence || 'One-time') + '</div></div><div style="text-align:right;"><div class="event-amount ' + amtCls + '">' + sign + fmt(e.amount) + '</div><div style="margin-top:4px;">' + statusBadge + '</div></div></div>';
      }).join('');
    });
  }
  html += '</div>';
  return html;
}

function renderCalSidebar() {
  const eventsContainer = document.getElementById('calSidebarEvents');
  const today = new Date(); today.setHours(0,0,0,0);
  refreshFinancialEvents();
  let upcoming = (state.financialEvents || []).filter(e => e.status !== 'completed' && e.status !== 'cancelled' && new Date(e.date) >= today).sort((a,b) => new Date(a.date) - new Date(b.date)).slice(0, 5);

  if (upcoming.length === 0) {
    if (eventsContainer) eventsContainer.innerHTML = '<div style="font-size:13px;color:var(--text-secondary);padding:8px 0;">No upcoming events</div>';
  } else {
    if (eventsContainer) {
      eventsContainer.innerHTML = upcoming.map(e => {
        const iconBg = e.type === 'income' ? 'income' : 'expense';
        const amtClass = e.type === 'income' ? 'income' : 'expense';
        const sign = e.type === 'income' ? '+' : '-';
        return `<div class="cal-event-row">
          <div class="cal-event-icon ${iconBg}">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/></svg>
          </div>
          <div class="cal-event-info">
            <div class="cal-event-name">${e.title}</div>
            <div class="cal-event-date">${fmtDate(e.date)} · ${e.recurrence || 'One-time'}</div>
          </div>
          <div class="cal-event-amount ${amtClass}">${sign}${fmt(e.amount)}</div>
        </div>`;
      }).join('');
    }
  }

  // Calculate summary for current month
  const mk = currentMonthKey();
  const monthEvents = (state.financialEvents || []).filter(e => monthKey(e.date) === mk && e.status !== 'completed' && e.status !== 'cancelled');
  const inc = monthEvents.filter(e => e.type === 'income').reduce((s,e) => s + e.amount, 0);
  const exp = monthEvents.filter(e => e.type === 'expense' || e.type === 'subscription').reduce((s,e) => s + e.amount, 0);
  const net = inc - exp;

  const incEl = document.getElementById('calSummaryIncome');
  const expEl = document.getElementById('calSummaryExpense');
  const netEl = document.getElementById('calSummaryNet');
  if (incEl) incEl.textContent = '+' + fmt(inc);
  if (expEl) expEl.textContent = '-' + fmt(exp);
  if (netEl) {
    netEl.textContent = (net >= 0 ? '+' : '-') + fmt(Math.abs(net));
    netEl.className = 'cal-summary-value ' + (net >= 0 ? 'income' : 'expense');
  }
}

function calGetTitle() {
  if (calViewMode === 'month') return calCurrentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  else if (calViewMode === 'week') { const ws = calGetWeekStart(calCurrentDate); const we = new Date(ws); we.setDate(we.getDate()+6); return ws.toLocaleDateString('en-US',{month:'short',day:'numeric'})+' \u2013 '+we.toLocaleDateString('en-US',{month:'short',day:'numeric'}); }
  else if (calViewMode === 'all') return 'All financial events';
  else return calCurrentDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}

function calGetWeekStart(date) { const d = new Date(date); d.setDate(d.getDate() - d.getDay()); return d; }
function calSetView(mode) { calViewMode = mode; document.querySelectorAll('.cal-view-btn').forEach(b => b.classList.toggle('active', b.dataset.view === mode)); renderCalendar(); }
function calPrev() { if (calViewMode==='all') return; if (calViewMode==='month') calCurrentDate.setMonth(calCurrentDate.getMonth()-1); else if (calViewMode==='week') calCurrentDate.setDate(calCurrentDate.getDate()-7); else calCurrentDate.setDate(calCurrentDate.getDate()-1); renderCalendar(); }
function calNext() { if (calViewMode==='all') return; if (calViewMode==='month') calCurrentDate.setMonth(calCurrentDate.getMonth()+1); else if (calViewMode==='week') calCurrentDate.setDate(calCurrentDate.getDate()+7); else calCurrentDate.setDate(calCurrentDate.getDate()+1); renderCalendar(); }

function calRenderMonth() {
  const year = calCurrentDate.getFullYear(), month = calCurrentDate.getMonth();
  const firstDay = new Date(year, month, 1), lastDay = new Date(year, month+1, 0);
  const startWeekday = firstDay.getDay(), daysInMonth = lastDay.getDate();
  const prevMonthLast = new Date(year, month, 0).getDate();
  const today = new Date(); today.setHours(0,0,0,0);
  const headers = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  let html = '<div class="cal-grid">';
  html += headers.map(h => '<div class="cal-day-header">'+h+'</div>').join('');
  for (let i = startWeekday-1; i >= 0; i--) { const day = prevMonthLast-i; const d = new Date(year, month-1, day); html += '<div class="cal-day other-month" onclick="calGoToDay(\''+d.toISOString()+'\')"><div class="cal-day-num">'+day+'</div>'+calEventsForDay(d)+'</div>'; }
  for (let day = 1; day <= daysInMonth; day++) { const d = new Date(year, month, day); const isToday = d.getTime()===today.getTime(); html += '<div class="cal-day'+(isToday?' today':'')+'" onclick="calGoToDay(\''+d.toISOString()+'\')"><div class="cal-day-num">'+day+'</div>'+calEventsForDay(d)+'</div>'; }
  const totalCells = startWeekday+daysInMonth; const remaining = (7-(totalCells%7))%7;
  for (let day = 1; day <= remaining; day++) { const d = new Date(year, month+1, day); html += '<div class="cal-day other-month" onclick="calGoToDay(\''+d.toISOString()+'\')"><div class="cal-day-num">'+day+'</div>'+calEventsForDay(d)+'</div>'; }
  html += '</div>'; return html;
}

function calEventsForDay(date) {
  const dateStr = date.toISOString().split('T')[0];
  const events = state.financialEvents.filter(e => e.date === dateStr && e.status !== 'cancelled');
  return events.slice(0,3).map(e => { const cls = getEventTypeColor(e.type); const sign = e.type==='income'?'+':'\u2212'; return '<div class="cal-event '+cls+'" onclick="event.stopPropagation();openEventDetail(\''+e.id+'\')">'+sign+fmt(e.amount)+' '+e.title.split(' ')[0]+'</div>'; }).join('') + (events.length>3?'<div class="cal-event neutral">+'+(events.length-3)+' more</div>':'');
}

function calRenderWeek() {
  const weekStart = calGetWeekStart(calCurrentDate); const today = new Date(); today.setHours(0,0,0,0);
  const headers = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  let html = '<div class="cal-week-grid">';
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart); d.setDate(d.getDate()+i); const isToday = d.getTime()===today.getTime(); const dateStr = d.toISOString().split('T')[0];
    const events = state.financialEvents.filter(e => e.date === dateStr && e.status !== 'cancelled');
    html += '<div class="cal-week-day'+(isToday?' today':'')+'"><div style="font-size:11px;color:var(--text-secondary);font-weight:600;text-transform:uppercase;margin-bottom:4px;">'+headers[i]+'</div><div class="cal-day-num" style="font-size:18px;margin-bottom:8px;">'+d.getDate()+'</div>'+events.map(e => { const cls=getEventTypeColor(e.type); const sign=e.type==='income'?'+':'\u2212'; const amtCls=e.type==='income'?'income':'expense'; return '<div class="event-item" onclick="openEventDetail(\''+e.id+'\')"><div class="event-dot '+cls+'"></div><div class="event-info"><div class="event-title">'+e.title+'</div><div class="event-meta">'+e.category+'</div></div><div class="event-amount '+amtCls+'">'+sign+fmt(e.amount)+'</div></div>'; }).join('')+'</div>';
  }
  html += '</div>'; return html;
}

function calRenderDay() {
  const dateStr = calCurrentDate.toISOString().split('T')[0];
  const events = state.financialEvents.filter(e => e.date === dateStr && e.status !== 'cancelled');
  let html = '<div class="cal-day-view">';
  html += '<button class="cal-create-btn" onclick="openCreateEventModal(\''+dateStr+'\')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Create event on ' + fmtDate(dateStr) + '</button>';
  if (events.length === 0) html += '<div class="empty-state">No financial events on this day</div>';
  else html += events.map(e => { const cls=getEventTypeColor(e.type); const sign=e.type==='income'?'+':'\u2212'; const amtCls=e.type==='income'?'income':'expense'; return '<div class="event-item" onclick="openEventDetail(\''+e.id+'\')"><div class="event-dot '+cls+'"></div><div class="event-info"><div class="event-title">'+e.title+'</div><div class="event-meta">'+e.category+' \u00b7 '+fmtDate(e.date)+' \u00b7 '+e.recurrence+'</div></div><div style="text-align:right;"><div class="event-amount '+amtCls+'">'+sign+fmt(e.amount)+'</div><div style="margin-top:4px;"><span class="event-status '+e.status+'">'+e.status.replace('-',' ')+'</span></div></div></div>'; }).join('');
  html += '</div>'; return html;
}

function calGoToDay(dateStr) { calCurrentDate = new Date(dateStr); calSetView('day'); }

// ============ EVENT DETAIL MODAL ============

function openEventDetail(eventId) {
  const event = state.financialEvents.find(e => e.id === eventId);
  if (!event) return;
  document.getElementById('eventDetailTitle').textContent = event.title;
  const sign = event.type==='income'?'+':'\u2212';
  const amtColor = event.type==='income'?'var(--success)':'var(--danger)';
  document.getElementById('eventDetailBody').innerHTML = '<div style="text-align:center;margin-bottom:20px;"><div style="font-size:28px;font-weight:700;color:'+amtColor+';">'+sign+fmt(event.amount)+'</div><div style="font-size:14px;color:var(--text-secondary);margin-top:4px;">'+event.category+' \u00b7 '+fmtDate(event.date)+'</div><div style="margin-top:8px;"><span class="event-status '+event.status+'">'+event.status.replace('-',' ')+'</span></div></div><div class="stat-row"><span class="stat-label">Type</span><span class="stat-value">'+event.type.charAt(0).toUpperCase()+event.type.slice(1)+'</span></div><div class="stat-row"><span class="stat-label">Recurrence</span><span class="stat-value">'+event.recurrence+'</span></div><div class="stat-row"><span class="stat-label">Google Calendar</span><span class="stat-value">'+(event.gcalEventId?'Synced':'Not synced')+'</span></div>'+(event.linkedTxId?'<div class="stat-row"><span class="stat-label">Linked transaction</span><span class="stat-value" style="color:var(--success);">Recorded</span></div>':'')+'<div class="stat-row"><span class="stat-label">Reminder</span><span class="stat-value">'+(event.reminderDays ? event.reminderDays : state.settings.defaultReminder)+' day(s) before</span></div>'+(event.notes?'<div class="stat-row"><span class="stat-label">Notes</span><span class="stat-value">'+event.notes+'</span></div>':'');
  let footerHtml = '';
  if (event.status !== 'completed' && event.status !== 'cancelled') {
    footerHtml += '<button class="btn btn-sm btn-primary" onclick="recordEventTransaction(\''+event.id+'\')">Record transaction</button>';
    footerHtml += '<button class="btn btn-sm" onclick="markEventCompleted(\''+event.id+'\')" style="margin-left:8px;">Mark as paid</button>';
  }
  if (event.status !== 'completed' && event.status !== 'cancelled') footerHtml += '<button class="btn btn-sm btn-danger" onclick="cancelEvent(\''+event.id+'\')" style="margin-left:8px;">'+(event.recurrence && event.recurrence !== 'one-time' ? 'Delete...' : 'Delete')+'</button>';
  if (state.settings.googleCalendar.connected && !event.gcalEventId && event.syncToGcal) footerHtml += '<button class="btn btn-sm" onclick="syncEventToGcal(\''+event.id+'\')" style="margin-left:8px;">Sync to Google</button>';
  document.getElementById('eventDetailFooter').innerHTML = footerHtml;
  document.getElementById('eventDetailModalOverlay').classList.add('active');
}

function closeEventDetailModal() { document.getElementById('eventDetailModalOverlay').classList.remove('active'); }

let editingCalendarEventId = null;

function editCalendarEvent(eventId) {
  const event = state.financialEvents.find(e => e.id === eventId);
  if (!event || event.sourceType !== 'manual') return;
  editingCalendarEventId = eventId;
  closeEventDetailModal();
  openCreateEventModal(event.date);
  setTimeout(() => {
    document.getElementById('createEventTitle').textContent = 'Edit event — ' + fmtDate(event.date);
    document.querySelectorAll('#createEventTypeSelector .type-btn').forEach(b => b.classList.toggle('active', b.dataset.etype === event.type));
    createEventType = event.type;
    document.getElementById('createEventName').value = event.title;
    document.getElementById('createEventAmount').value = event.amount;
    document.getElementById('createEventDate').value = event.date;
    document.getElementById('createEventCategory').value = event.category;
    populateAccountSelect('createEventAccount', false);
    if (event.accountId && document.getElementById('createEventAccount')) document.getElementById('createEventAccount').value = event.accountId;
    document.getElementById('createEventNotes').value = event.notes || '';
    document.getElementById('toggleCreateEventRecurring').classList.toggle('on', event.recurrence !== 'one-time');
    document.getElementById('createEventRecurringOptions').style.display = event.recurrence !== 'one-time' ? 'block' : 'none';
    if (event.recurrence !== 'one-time') document.getElementById('createEventFreq').value = event.recurrence;
    document.getElementById('createEventReminder').value = String(event.reminderDays !== null ? event.reminderDays : state.settings.defaultReminder || 1);
    document.getElementById('toggleCreateEventGcal').classList.toggle('on', !!event.syncToGcal);
  }, 50);
}

function deleteManualEvent(eventId) {
  const event = state.financialEvents.find(e => e.id === eventId);
  if (!event) return;
  confirmDelete('Delete event?', 'Are you sure you want to delete "' + event.title + '"?', () => {
    if (event.gcalEventId && state.settings.googleCalendar.connected) deleteGcalEvent(event.gcalEventId);
    state.financialEvents = state.financialEvents.filter(e => e.id !== eventId);
    saveData();
    showToast('Event deleted');
    closeEventDetailModal();
    renderCalendar();
  });
}

function markEventCompleted(eventId) {
  const event = state.financialEvents.find(e => e.id === eventId);
  if (event) {
    event.status = 'completed';
    const txType = event.type === 'income' ? 'income' : 'expense';
    const tx = { id: uid(), date: event.date, amount: event.amount, type: txType, category: event.category, description: event.title, payment: 'Bank Transfer', tags: ['scheduled'], notes: 'Auto-created from scheduled event', accountId: event.accountId || null };
    state.transactions.push(tx); event.linkedTxId = tx.id;
    if (txType === 'income') state.balance += event.amount; else state.balance -= event.amount;
    if (event.accountId) {
      const acct = state.accounts.find(a => a.id === event.accountId);
      if (acct) {
        if (txType === 'income') acct.balance += event.amount;
        else acct.balance -= event.amount;
      }
    }
    saveData(); showToast('Event marked as paid and transaction recorded');
    closeEventDetailModal();
    const ap = document.querySelector('.page.active').id.replace('page-',''); navigate(ap);
  }
}

function recordEventTransaction(eventId) {
  const event = state.financialEvents.find(e => e.id === eventId);
  if (!event) return;
  closeEventDetailModal();
  const txType = event.type === 'income' ? 'income' : 'expense';
  openModal();
  setTimeout(() => {
    currentTxType = txType;
    updateTypeSelector(txType);
    updateCategoryOptions(txType);
    if (document.getElementById('txCategory')) {
      const opts = [...document.getElementById('txCategory').options];
      const match = opts.find(o => o.value === event.category);
      if (match) document.getElementById('txCategory').value = event.category;
    }
    document.getElementById('txAmount').value = event.amount;
    document.getElementById('txDate').value = event.date;
    document.getElementById('txDescription').value = event.title;
    if (event.notes) document.getElementById('txNotes').value = event.notes;
    if (event.accountId && document.getElementById('txAccount')) document.getElementById('txAccount').value = event.accountId;
  }, 50);
  event.status = 'completed';
  event.linkedTxId = 'pending';
  saveData();
}

function cancelEvent(eventId) {
  const event = state.financialEvents.find(e => e.id === eventId);
  if (!event) return;
  const isRecurring = event.recurrence && event.recurrence !== 'one-time';
  if (isRecurring) {
    // Show 3 options for recurring events
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay active';
    overlay.style.zIndex = '300';
    const safeTitle = escapeHtml(event.title);
    const safeEventId = escapeHtml(eventId);
    overlay.innerHTML = '<div class="modal" style="max-width:400px;"><div class="modal-header"><div class="modal-title" style="color:var(--danger);">Delete recurring event</div><button class="modal-close" onclick="this.closest(\'.modal-overlay\').remove()">&times;</button></div><div class="modal-body"><p style="font-size:14px;color:var(--text-secondary);line-height:1.6;margin-bottom:16px;">"' + safeTitle + '" is a recurring event. Choose what to delete:</p><div style="display:flex;flex-direction:column;gap:8px;"><button class="btn" style="text-align:left;justify-content:flex-start;" onclick="deleteRecurringEvent(\'' + safeEventId + '\',\'this\')">Delete this event only (' + fmtDate(event.date) + ')</button><button class="btn" style="text-align:left;justify-content:flex-start;" onclick="deleteRecurringEvent(\'' + safeEventId + '\',\'future\')">Delete this and all future events</button><button class="btn" style="text-align:left;justify-content:flex-start;" onclick="deleteRecurringEvent(\'' + safeEventId + '\',\'all\')">Delete all occurrences (past and future)</button></div></div><div class="modal-footer"><button class="btn" onclick="this.closest(\'.modal-overlay\').remove()">Cancel</button></div></div>';
    document.body.appendChild(overlay);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
  } else {
    confirmDelete('Cancel this event?', 'Are you sure you want to cancel \"' + event.title + '\" on ' + fmtDate(event.date) + '?', () => {
      event.status = 'cancelled';
      if (event.gcalEventId && state.settings.googleCalendar.connected) deleteGcalEvent(event.gcalEventId);
      saveData(); showToast('Event cancelled'); closeEventDetailModal();
      const ap = document.querySelector('.page.active').id.replace('page-',''); navigate(ap);
    });
  }
}

function deleteRecurringEvent(eventId, scope) {
  const event = state.financialEvents.find(e => e.id === eventId);
  if (!event) return;
  document.querySelectorAll('.modal-overlay').forEach(o => { if (o.style.zIndex === '300') o.remove(); });
  const eventDate = new Date(event.date);
  const matching = state.financialEvents.filter(e => e.title === event.title && e.sourceType === event.sourceType);
  if (scope === 'this') {
    event.status = 'cancelled';
    if (event.gcalEventId && state.settings.googleCalendar.connected) deleteGcalEvent(event.gcalEventId);
    showToast('This event deleted');
  } else if (scope === 'future') {
    matching.forEach(e => { if (new Date(e.date) >= eventDate) { e.status = 'cancelled'; if (e.gcalEventId && state.settings.googleCalendar.connected) deleteGcalEvent(e.gcalEventId); } });
    showToast('This and future events deleted');
  } else if (scope === 'all') {
    matching.forEach(e => { e.status = 'cancelled'; if (e.gcalEventId && state.settings.googleCalendar.connected) deleteGcalEvent(e.gcalEventId); });
    showToast('All occurrences deleted');
  }
  saveData(); closeEventDetailModal();
  const ap = document.querySelector('.page.active').id.replace('page-',''); navigate(ap);
}

// ============ SETTINGS ============

function renderSettings() {
  // Profile
  if (state.profile) {
    document.getElementById('profileName').value = state.profile.name || '';
    document.getElementById('profileEmail').value = state.profile.email || '';
    document.getElementById('profileCurrency').value = state.profile.currency || '₦';
    document.getElementById('profileMonthStart').value = state.profile.monthStart || 1;
  }
  // Dark mode toggle
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  setToggleState('toggleDarkMode', isDark);
  // Google Calendar
  const statusEl = document.getElementById('gcalStatusBadge');
  const g = state.settings.googleCalendar;
  if (g.connected) {
    statusEl.innerHTML = '<div class="gcal-status connected"><span class="gcal-dot"></span> Connected</div>';
    document.getElementById('gcalConnectSection').style.display = 'none';
    document.getElementById('gcalConnectedSection').style.display = 'block';
    document.getElementById('gcalAccountEmail').textContent = g.accountEmail || 'Google Calendar connected';
    const select = document.getElementById('gcalSelect');
    select.innerHTML = (g.calendars||[]).map(c => '<option value="'+c.id+'" '+(c.id===g.calendarId?'selected':'')+'>'+c.summary+'</option>').join('');
  } else {
    statusEl.innerHTML = '<div class="gcal-status disconnected"><span class="gcal-dot"></span> Not connected</div>';
    document.getElementById('gcalConnectSection').style.display = 'block';
    document.getElementById('gcalConnectedSection').style.display = 'none';
    const signInNote = document.getElementById('gcalSignInNote');
    if (signInNote) signInNote.style.display = isGoogleSignedIn() ? 'none' : 'block';
  }
  setToggleState('toggleSyncSubs', state.settings.syncSubscriptions);
  setToggleState('toggleSyncBills', state.settings.syncBills);
  setToggleState('toggleSyncSalary', state.settings.syncSalary);
  setToggleState('toggleSyncGoals', state.settings.syncGoals);
  setToggleState('toggleNotifs', state.settings.notifications);
  setToggleState('toggleBrowserNotifs', state.settings.browserNotifs);
  renderBrowserNotifUI();
  const pinLock = state.settings.pinLock || { enabled: false };
  setToggleState('togglePinLock', pinLock.enabled);
  document.getElementById('pinLockActions').style.display = pinLock.enabled ? '' : 'none';
  checkSecurityStatus();
  document.getElementById('defaultReminder').value = state.settings.defaultReminder;
  document.getElementById('notifWindow').value = state.settings.notifWindow;
  renderIncomeEventList();
  renderAutoRules();
  populateRuleCategoryOptions();
  updateLastBackupUI();
  const storageDesc = document.getElementById('dataStorageDesc');
  if (storageDesc) {
    storageDesc.textContent = currentUser && !isGuest
      ? 'Your data is synced to the cloud and also cached locally in your browser.'
      : 'Your data is stored locally in your browser. Sign in to enable cloud sync.';
  }
}

function setToggleState(id, value) { const el = document.getElementById(id); if (el) el.classList.toggle('on', !!value); }
function toggleSetting(key, el) { state.settings[key] = !state.settings[key]; el.classList.toggle('on', state.settings[key]); saveData(); }
function changeDefaultReminder() { state.settings.defaultReminder = parseInt(document.getElementById('defaultReminder').value); saveData(); }
function changeNotifWindow() { state.settings.notifWindow = parseInt(document.getElementById('notifWindow').value); saveData(); }

function renderAutoRules() {
  const container = document.getElementById('autoRulesList');
  if (!container) return;
  const rules = state.autoRules || [];
  if (rules.length === 0) {
    container.innerHTML = '<div class="settings-desc" style="color:var(--text-tertiary);font-style:italic;">No rules yet. Add keywords to auto-categorize transactions.</div>';
    return;
  }
  container.innerHTML = rules.map((r, i) => {
    const kwText = (r.keywords || []).join(', ');
    return `<div class="auto-rule-item">
      <div style="display:flex;align-items:center;gap:8px;min-width:0;">
        <span class="rule-keywords">${kwText}</span>
        <span class="rule-target">→ ${r.type} / ${r.category}</span>
      </div>
      <div class="rule-actions">
        <button class="btn btn-sm" style="padding:4px 8px;font-size:12px;" onclick="deleteAutoRule(${i})">Remove</button>
      </div>
    </div>`;
  }).join('');
}

function addAutoRule() {
  const kwStr = document.getElementById('ruleKeywords').value.trim();
  const type = document.getElementById('ruleType').value;
  const category = document.getElementById('ruleCategory').value;
  if (!kwStr || !category) { showToast('Enter keywords and select a category'); return; }
  const keywords = kwStr.split(',').map(k => k.trim().toLowerCase()).filter(Boolean);
  if (keywords.length === 0) { showToast('Enter at least one keyword'); return; }
  state.autoRules = state.autoRules || [];
  state.autoRules.push({ keywords, type, category });
  saveData();
  document.getElementById('ruleKeywords').value = '';
  renderAutoRules();
  showToast('Rule added');
}

function deleteAutoRule(index) {
  state.autoRules.splice(index, 1);
  saveData();
  renderAutoRules();
  showToast('Rule removed');
}

function applyAutoCategorization(description, currentType) {
  if (!description || !state.autoRules || state.autoRules.length === 0) return null;
  const desc = description.toLowerCase();
  for (const rule of state.autoRules) {
    for (const kw of rule.keywords) {
      if (desc.includes(kw)) {
        return { type: rule.type, category: rule.category };
      }
    }
  }
  return null;
}

function onTxDescriptionInput() {
  if (editingTxId) return; // Don't auto-categorize when editing
  const desc = document.getElementById('txDescription').value;
  const suggestion = applyAutoCategorization(desc, currentTxType);
  if (suggestion) {
    // Only auto-switch type/category if user hasn't manually changed it recently
    // For simplicity, just apply it if the current type/category doesn't match
    if (currentTxType !== suggestion.type) {
      currentTxType = suggestion.type;
      updateTypeSelector(suggestion.type);
      updateCategoryOptions(suggestion.type);
      updateTransferFields(suggestion.type);
    }
    const catSelect = document.getElementById('txCategory');
    if (catSelect && catSelect.value !== suggestion.category) {
      // Check if option exists
      const opts = [...catSelect.options].map(o => o.value);
      if (opts.includes(suggestion.category)) {
        catSelect.value = suggestion.category;
        // Flash the field subtly to show it was auto-filled
        catSelect.style.transition = 'background 0.3s';
        catSelect.style.background = 'var(--success-bg)';
        setTimeout(() => { catSelect.style.background = ''; }, 600);
      }
    }
  }
}

function populateRuleCategoryOptions() {
  const type = document.getElementById('ruleType').value;
  let cats;
  if (type === 'income') cats = incomeCategories;
  else if (type === 'giving') cats = givingCategories;
  else if (type === 'transfer') cats = transferCategories;
  else cats = expenseCategories;
  document.getElementById('ruleCategory').innerHTML = cats.map(c => '<option value="' + escapeHtml(c) + '">' + escapeHtml(c) + '</option>').join('');
}


// ============ BROWSER PUSH NOTIFICATIONS ============

function getBrowserNotifPermissionText() {
  if (!('Notification' in window)) return 'Not supported on this device';
  if (Notification.permission === 'granted') return 'Permission granted';
  if (Notification.permission === 'denied') return 'Permission denied';
  return 'Permission not requested';
}

// ============ PIN LOCK ============

let currentPinEntry = '';
let setupPinEntry = '';
let setupPinConfirm = '';
let setupPinMode = 'setup'; // 'setup' or 'change'
let lastActivity = Date.now();

function hashPin(pin) {
  // Iterated hash with salt — better than single-pass but still client-side only
  const salt = 'FinanceOS-v2-' + (state.profile.email || 'default');
  let input = pin + salt;
  let hash = 0;
  for (let round = 0; round < 5000; round++) {
    let h = 0;
    for (let j = 0; j < input.length; j++) {
      h = ((h << 5) - h) + input.charCodeAt(j);
      h |= 0;
    }
    input = Math.abs(h).toString(36) + salt;
    hash = h;
  }
  return Math.abs(hash).toString(36);
}

function showPinOverlay() {
  currentPinEntry = '';
  updatePinDots();
  document.getElementById('pinError').textContent = '';
  document.getElementById('pinForgot').style.display = '';
  const overlay = document.getElementById('pinOverlay');
  overlay.style.display = 'flex';
  overlay.classList.remove('hidden');
}

function hidePinOverlay() {
  const overlay = document.getElementById('pinOverlay');
  overlay.classList.add('hidden');
  setTimeout(() => { overlay.style.display = 'none'; }, 300);
  currentPinEntry = '';
}

function updatePinDots() {
  for (let i = 0; i < 4; i++) {
    const dot = document.getElementById('pd-' + i);
    if (dot) dot.classList.toggle('filled', i < currentPinEntry.length);
  }
}

function updateSetupPinDots() {
  for (let i = 0; i < 4; i++) {
    const dot = document.getElementById('psd-' + i);
    if (dot) dot.classList.toggle('filled', i < setupPinEntry.length);
  }
}

function enterPinDigit(d) {
  if (currentPinEntry.length >= 4) return;
  currentPinEntry += d;
  updatePinDots();
  if (currentPinEntry.length === 4) {
    setTimeout(checkPin, 150);
  }
}

function backspacePin() {
  currentPinEntry = currentPinEntry.slice(0, -1);
  updatePinDots();
  document.getElementById('pinError').textContent = '';
  // remove error styling
  for (let i = 0; i < 4; i++) document.getElementById('pd-' + i).classList.remove('error');
}

function hashPinLegacy(pin) {
  // Original simple hash for backward compatibility with existing PINs
  let hash = 0;
  for (let i = 0; i < pin.length; i++) {
    const chr = pin.charCodeAt(i);
    hash = ((hash << 5) - hash) + chr;
    hash |= 0;
  }
  return hash.toString();
}

function checkPin() {
  const pinLock = state.settings.pinLock || {};
  const hashNew = hashPin(currentPinEntry);
  const hashOld = hashPinLegacy(currentPinEntry);
  if (hashNew === pinLock.pinHash || hashOld === pinLock.pinHash) {
    // If matched with old hash, silently upgrade to new hash on unlock
    if (hashOld === pinLock.pinHash && hashNew !== pinLock.pinHash) {
      state.settings.pinLock.pinHash = hashNew;
      saveData();
    }
    hidePinOverlay();
    lastActivity = Date.now();
    showToast('Unlocked');
  } else {
    currentPinEntry = '';
    updatePinDots();
    document.getElementById('pinError').textContent = 'Incorrect PIN. Try again.';
    for (let i = 0; i < 4; i++) {
      const dot = document.getElementById('pd-' + i);
      dot.classList.add('error');
      setTimeout(() => dot.classList.remove('error'), 500);
    }
  }
}

function openPinSetupModal(mode) {
  setupPinMode = mode;
  setupPinEntry = '';
  setupPinConfirm = '';
  updateSetupPinDots();
  document.getElementById('pinSetupError').textContent = '';
  document.getElementById('pinSetupTitle').textContent = mode === 'change' ? 'Change PIN' : 'Set up PIN';
  document.getElementById('pinSetupSubtitle').textContent = 'Create a 4-digit PIN';
  document.getElementById('pinSetupOverlay').classList.add('active');
}

function closePinSetup() {
  document.getElementById('pinSetupOverlay').classList.remove('active');
  setupPinEntry = '';
  setupPinConfirm = '';
}

function enterSetupPinDigit(d) {
  if (setupPinEntry.length >= 4) return;
  setupPinEntry += d;
  updateSetupPinDots();
  if (setupPinEntry.length === 4) {
    if (setupPinConfirm === '') {
      // First entry done, ask to confirm
      setupPinConfirm = setupPinEntry;
      setupPinEntry = '';
      updateSetupPinDots();
      document.getElementById('pinSetupSubtitle').textContent = 'Confirm your PIN';
      document.getElementById('pinSetupError').textContent = '';
    } else {
      // Confirming
      if (setupPinEntry === setupPinConfirm) {
        state.settings.pinLock = { enabled: true, pinHash: hashPin(setupPinEntry) };
        saveData();
        closePinSetup();
        renderSettings();
        showToast(setupPinMode === 'change' ? 'PIN changed' : 'PIN set');
      } else {
        setupPinEntry = '';
        setupPinConfirm = '';
        updateSetupPinDots();
        document.getElementById('pinSetupSubtitle').textContent = 'Create a 4-digit PIN';
        document.getElementById('pinSetupError').textContent = 'PINs did not match. Try again.';
      }
    }
  }
}

function backspaceSetupPin() {
  setupPinEntry = setupPinEntry.slice(0, -1);
  updateSetupPinDots();
  document.getElementById('pinSetupError').textContent = '';
}

function togglePinLock() {
  const pinLock = state.settings.pinLock || { enabled: false };
  if (pinLock.enabled) {
    // Turning off — ask for current PIN first
    confirmDelete('Remove PIN lock?', 'Your app will no longer require a PIN to open.', () => {
      state.settings.pinLock = { enabled: false, pinHash: null };
      saveData();
      renderSettings();
      showToast('PIN lock removed');
    });
  } else {
    // Turning on — open setup modal
    openPinSetupModal('setup');
  }
}

function resetPin() {
  confirmDelete('Forgot PIN?', 'This will sign you out and delete all local data. You can sign back in to restore your cloud data.', () => {
    signOutUser();
    localStorage.clear();
    location.reload();
  });
}

function checkPinAutoLock() {
  const pinLock = state.settings.pinLock || {};
  if (!pinLock.enabled) return;
  const inactive = Date.now() - lastActivity;
  const lockAfter = 5 * 60 * 1000; // 5 minutes
  if (inactive > lockAfter && document.getElementById('pinOverlay').style.display !== 'flex') {
    showPinOverlay();
  }
}

// Track activity for auto-lock
['click', 'touchstart', 'keydown', 'scroll'].forEach(evt => {
  document.addEventListener(evt, () => { lastActivity = Date.now(); }, { passive: true });
});
setInterval(checkPinAutoLock, 10000);

window.togglePinLock = togglePinLock;
window.enterPinDigit = enterPinDigit;
window.backspacePin = backspacePin;
window.enterSetupPinDigit = enterSetupPinDigit;
window.backspaceSetupPin = backspaceSetupPin;
window.closePinSetup = closePinSetup;
window.openPinSetupModal = openPinSetupModal;
window.resetPin = resetPin;

function checkSecurityStatus() {
  const el = document.getElementById('securityStatus');
  if (!el) return;
  const checks = [];
  // PIN lock
  const pinLock = state.settings.pinLock || {};
  checks.push(pinLock.enabled ? 'PIN lock enabled' : 'PIN lock disabled');
  // Auth provider
  if (currentUser) {
    const hasGoogle = currentUser.providerData.some(p => p.providerId === 'google.com');
    const hasEmail = currentUser.providerData.some(p => p.providerId === 'password');
    checks.push(hasGoogle ? 'Google sign-in' : (hasEmail ? 'Email sign-in' : 'Signed in'));
  } else {
    checks.push('Not signed in');
  }
  // Data storage
  checks.push(currentUser && !isGuest ? 'Cloud sync active' : 'Local storage only');
  el.innerHTML = checks.map(c => '<span style="display:inline-flex;align-items:center;gap:4px;margin-right:12px;"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--success)" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>' + c + '</span>').join('');
}
window.checkSecurityStatus = checkSecurityStatus;

// ============ BROWSER PUSH NOTIFICATIONS ============

function toggleBrowserNotifs(el) {
  const enabled = !state.settings.browserNotifs;
  state.settings.browserNotifs = enabled;
  el.classList.toggle('on', enabled);
  saveData();
  renderBrowserNotifUI();
  if (enabled) {
    requestBrowserNotifPermission();
  }
}
window.toggleBrowserNotifs = toggleBrowserNotifs;

function requestBrowserNotifPermission() {
  if (!('Notification' in window)) { showToast('Notifications not supported on this browser'); return; }
  if (Notification.permission === 'granted') {
    renderBrowserNotifUI();
    checkAndShowBrowserNotifications();
    return;
  }
  if (Notification.permission === 'denied') {
    showToast('Notifications blocked. Please enable them in your browser settings.');
    renderBrowserNotifUI();
    return;
  }
  Notification.requestPermission().then((permission) => {
    renderBrowserNotifUI();
    if (permission === 'granted') {
      showToast('Notifications enabled');
      checkAndShowBrowserNotifications();
    } else if (permission === 'denied') {
      showToast('Notifications blocked');
    }
  });
}
window.requestBrowserNotifPermission = requestBrowserNotifPermission;

function renderBrowserNotifUI() {
  const statusEl = document.getElementById('browserNotifStatus');
  const permRow = document.getElementById('browserNotifPermissionRow');
  const permBtn = document.getElementById('notifPermissionBtn');
  if (statusEl) statusEl.textContent = '(' + getBrowserNotifPermissionText() + ')';
  if (permRow) {
    const needsRequest = ('Notification' in window) && Notification.permission !== 'granted' && state.settings.browserNotifs;
    permRow.style.display = needsRequest ? 'block' : 'none';
  }
  if (permBtn) {
    const notifSupported = 'Notification' in window;
    if (notifSupported) {
      permBtn.textContent = Notification.permission === 'denied' ? 'Blocked — open browser settings' : 'Allow notifications';
      permBtn.disabled = Notification.permission === 'denied';
      permBtn.style.opacity = Notification.permission === 'denied' ? '0.5' : '1';
    } else {
      permBtn.textContent = 'Not supported';
      permBtn.disabled = true;
      permBtn.style.opacity = '0.5';
    }
  }
}

function canShowBrowserNotif() {
  return ('Notification' in window) && Notification.permission === 'granted' && state.settings.browserNotifs;
}

function getNotifId(event, dateStr) {
  return event.id + '_' + dateStr;
}

function checkAndShowBrowserNotifications() {
  if (!canShowBrowserNotif()) return;
  if (!state.financialEvents || state.financialEvents.length === 0) return;

  const today = new Date(); today.setHours(0,0,0,0);
  const win = state.settings.notifWindow || 7;
  const cutoff = new Date(today); cutoff.setDate(cutoff.getDate() + win);

  if (!state.shownNotifIds) state.shownNotifIds = [];
  const newShownIds = [];

  const eventsToNotify = state.financialEvents.filter(e => {
    if (e.status === 'completed' || e.status === 'cancelled') return false;
    const ed = new Date(e.date); ed.setHours(0,0,0,0);
    return ed >= today && ed <= cutoff;
  }).sort((a,b) => new Date(a.date) - new Date(b.date));

  if (eventsToNotify.length === 0) return;

  // Group by date for nicer messages
  const byDate = {};
  eventsToNotify.forEach(e => {
    const key = e.date;
    if (!byDate[key]) byDate[key] = [];
    byDate[key].push(e);
  });

  Object.entries(byDate).forEach(([dateStr, events]) => {
    events.forEach(event => {
      const notifId = getNotifId(event, dateStr);
      if (state.shownNotifIds.includes(notifId)) return;

      const ed = new Date(dateStr); ed.setHours(0,0,0,0);
      const diffDays = Math.round((ed - today) / 86400000);

      let title, body;
      const sign = event.type === 'income' ? '+' : '';
      const amountText = fmt(event.amount);

      if (diffDays === 0) {
        title = event.title + ' due today';
        body = sign + amountText;
      } else if (diffDays === 1) {
        title = event.title + ' due tomorrow';
        body = sign + amountText;
      } else {
        title = event.title + ' in ' + diffDays + ' days';
        body = sign + amountText;
      }

      // Show via service worker if available, otherwise direct Notification
      showBrowserNotification(title, body, notifId);
      newShownIds.push(notifId);
    });
  });

  if (newShownIds.length > 0) {
    state.shownNotifIds = [...state.shownNotifIds, ...newShownIds];
    // Keep array from growing too large — keep last 200
    if (state.shownNotifIds.length > 200) {
      state.shownNotifIds = state.shownNotifIds.slice(-200);
    }
    saveData();
  }
}
window.checkAndShowBrowserNotifications = checkAndShowBrowserNotifications;

function showBrowserNotification(title, body, tag) {
  // Try to send to service worker for background-capable notifications
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({
      type: 'SHOW_NOTIFICATION',
      title: title,
      body: body,
      tag: tag,
      icon: './icon-192.svg'
    });
  } else if ('Notification' in window) {
    // Fallback to direct Notification API
    try { new Notification(title, { body: body, tag: tag, icon: './icon-192.svg' }); } catch(e) {}
  }
}
window.showBrowserNotification = showBrowserNotification;

function clearOldNotificationIds() {
  // Clean up shownNotifIds that reference dates in the past (older than 30 days)
  if (!state.shownNotifIds) return;
  const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 30);
  const cutoffStr = cutoff.toISOString().split('T')[0];
  state.shownNotifIds = state.shownNotifIds.filter(id => {
    const datePart = id.split('_').pop();
    return datePart >= cutoffStr;
  });
}

function saveProfile() {
  if (!state.autoRules) state.autoRules = [];
  if (!state.profile) state.profile = { name: '', currency: '₦', currencyCode: 'NGN', monthStart: 1, email: '' };
  state.profile.name = document.getElementById('profileName').value;
  state.profile.email = document.getElementById('profileEmail').value;
  state.profile.monthStart = parseInt(document.getElementById('profileMonthStart').value);
  saveData();
  showToast('Profile saved');
}

function changeCurrency() {
  const select = document.getElementById('profileCurrency');
  const symbol = select.value;
  const code = select.options[select.selectedIndex].dataset.code;
  if (!state.profile) state.profile = {};
  state.profile.currency = symbol;
  state.profile.currencyCode = code;
  saveData();
  showToast('Currency updated to ' + symbol);
  const ap = document.querySelector('.page.active').id.replace('page-',''); navigate(ap);
}

function exportJSON() {
  const dataStr = JSON.stringify(state, null, 2);
  const blob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'finance-os-backup-' + new Date().toISOString().split('T')[0] + '.json';
  a.click();
  URL.revokeObjectURL(url);
  recordBackup();
  showToast('Full backup exported to JSON');
}
window.exportJSON = exportJSON;

function importJSON(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const data = JSON.parse(e.target.result);
      // Validate structure
      if (!data || typeof data !== 'object') { showToast('Invalid backup file'); return; }
      if (!Array.isArray(data.transactions)) { showToast('Invalid backup: missing transactions'); return; }
      if (!data.settings || typeof data.settings !== 'object') { showToast('Invalid backup: missing settings'); return; }

      // Confirm before overwriting
      confirmImport(data);
    } catch(err) {
      console.error('Import error:', err);
      showToast('Could not read backup file');
    }
  };
  reader.onerror = function() { showToast('Failed to read file'); };
  reader.readAsText(file);
  // Reset file input so same file can be selected again
  event.target.value = '';
}
window.importJSON = importJSON;

function confirmImport(data) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay active';
  overlay.style.zIndex = '300';
  overlay.innerHTML = `<div class="modal" style="max-width:420px;">
    <div class="modal-header">
      <div class="modal-title" style="color:var(--danger);">Restore backup?</div>
      <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">&times;</button>
    </div>
    <div class="modal-body">
      <p style="font-size:14px;color:var(--text-secondary);line-height:1.6;margin-bottom:12px;">This will <strong style="color:var(--danger);">replace all current data</strong> with the imported backup.</p>
      <div style="background:var(--card-bg);border:1px solid var(--border);border-radius:8px;padding:12px;margin-bottom:12px;">
        <div style="font-size:13px;color:var(--text);margin-bottom:4px;"><strong>Backup contents:</strong></div>
        <div style="font-size:12px;color:var(--text-secondary);line-height:1.6;">
          ${data.transactions?.length || 0} transactions · ${data.subscriptions?.length || 0} subscriptions · ${Object.keys(data.budgets||{}).length} budgets · ${data.goals?.length || 0} goals · ${data.incomeEvents?.length || 0} income events
        </div>
      </div>
      <p style="font-size:13px;color:var(--text-tertiary);">Your current data will be overwritten. Consider exporting a backup first if you're unsure.</p>
    </div>
    <div class="modal-footer">
      <button class="btn" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
      <button class="btn btn-danger" id="confirmImportBtn">Restore backup</button>
    </div>
  </div>`;
  document.body.appendChild(overlay);
  document.getElementById('confirmImportBtn').onclick = function() {
    overlay.remove();
    applyImport(data);
  };
}
window.confirmImport = confirmImport;

function applyImport(data) {
  state = data;
  if (!state.autoRules) state.autoRules = [];
  if (!state.profile) state.profile = { name: '', currency: '₦', currencyCode: 'NGN', monthStart: 1, email: '' };
  if (!state.incomeEvents) state.incomeEvents = [];
  if (!state.financialEvents) state.financialEvents = [];
  if (!state.accounts) state.accounts = [];
  if (!state.budgetIcons) state.budgetIcons = {};
  ensureStateDefaults();
  saveData();
  showToast('Backup restored successfully');
  navigate('dashboard');
}
window.applyImport = applyImport;

function confirmClearData() {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay active';
  overlay.style.zIndex = '300';
  overlay.innerHTML = `<div class="modal" style="max-width:400px;">
    <div class="modal-header">
      <div class="modal-title" style="color:var(--danger);">Clear all data?</div>
      <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">&times;</button>
    </div>
    <div class="modal-body">
      <p style="font-size:14px;color:var(--text-secondary);line-height:1.6;margin-bottom:16px;">This will permanently delete all transactions, subscriptions, budgets, goals, income events, and settings. This action <strong style="color:var(--danger);">cannot be undone</strong>.</p>
      <p style="font-size:13px;color:var(--text-secondary);margin-bottom:8px;">Type <strong>DELETE</strong> to confirm:</p>
      <input type="text" class="form-input" id="clearConfirmInput" placeholder="Type DELETE" style="border-color:var(--danger);">
    </div>
    <div class="modal-footer">
      <button class="btn" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
      <button class="btn btn-danger" id="clearConfirmBtn" disabled onclick="clearAllData()">Delete everything</button>
    </div>
  </div>`;
  document.body.appendChild(overlay);
  const input = document.getElementById('clearConfirmInput');
  const btn = document.getElementById('clearConfirmBtn');
  input.addEventListener('input', () => { btn.disabled = input.value !== 'DELETE'; });
}
window.confirmClearData = confirmClearData;

function clearAllData() {
  state = {
    transactions: [], subscriptions: [], budgets: {}, goals: [], balance: 0,
    incomeEvents: [], financialEvents: [], hasOnboarded: true,
    dashEmptyDismissed: false,
    profile: { name: state.profile?.name || '', currency: state.profile?.currency || '₦', currencyCode: state.profile?.currencyCode || 'NGN', monthStart: state.profile?.monthStart || 1, email: state.profile?.email || '' },
    settings: {
      googleCalendar: { connected: false, accessToken: null, tokenExpiry: null, calendarId: null, calendars: [], clientId: '', accountEmail: '' },
      syncSubscriptions: true, syncBills: true, syncSalary: true, syncGoals: false,
      defaultReminder: 1, notifications: true, notifWindow: 7
    }
  };
  saveData();
  document.querySelectorAll('.modal-overlay').forEach(o => o.remove());
  showToast('All data cleared');
  navigate('dashboard');
}
window.clearAllData = clearAllData;

function renderIncomeEventList() {
  const c = document.getElementById('incomeEventList');
  if (!state.incomeEvents || state.incomeEvents.length === 0) { c.innerHTML = '<div class="empty-state">No recurring income events yet</div>'; return; }
  c.innerHTML = state.incomeEvents.map(inc => '<div class="settings-row"><div><div class="settings-label">'+inc.name+'</div><div class="settings-desc">'+fmt(inc.amount)+' \u00b7 '+inc.frequency+' \u00b7 next: '+fmtDate(inc.nextDate)+' \u00b7 '+getAccountName(inc.accountId)+'</div></div><div style="display:flex;align-items:center;gap:8px;"><span class="badge badge-success">'+(inc.active?'Active':'Inactive')+'</span><button class="tx-action-btn" onclick="deleteIncomeEvent(\''+inc.id+'\')">'+iconDelete+'</button></div></div>').join('');
}

function openIncomeEventModal() {
  ['incomeEventName','incomeEventAmount','incomeEventDate'].forEach(id => document.getElementById(id).value = '');
  populateAccountSelect('incomeEventAccount', false);
  document.getElementById('toggleIncomeEventGcal').classList.remove('on');
  document.getElementById('incomeEventModalOverlay').classList.add('active');
}
function closeIncomeEventModal() { document.getElementById('incomeEventModalOverlay').classList.remove('active'); }

function saveIncomeEvent() {
  const name = document.getElementById('incomeEventName').value;
  const amount = parseFloat(document.getElementById('incomeEventAmount').value);
  if (!name || !amount) { showToast('Enter name and amount'); return; }
  const frequency = document.getElementById('incomeEventFreq').value;
  const nextDate = document.getElementById('incomeEventDate').value || addDays(new Date(), 30);
  const category = document.getElementById('incomeEventCat').value;
  const accountId = document.getElementById('incomeEventAccount').value || null;
  const syncToGcal = document.getElementById('toggleIncomeEventGcal').classList.contains('on');
  const inc = { id: uid(), name, amount, frequency, nextDate, category, accountId, syncToGcal, gcalEventId: null, active: true };
  state.incomeEvents.push(inc);
  refreshFinancialEvents();
  if (syncToGcal && state.settings.googleCalendar.connected) syncIncomeEventToGcal(inc);
  saveData(); closeIncomeEventModal(); showToast('Income event saved'); renderIncomeEventList();
}

function deleteIncomeEvent(id) {
  const inc = state.incomeEvents.find(e => e.id === id);
  if (!inc) return;
  confirmDelete('Delete income event?', 'Are you sure you want to delete "' + inc.name + '" (' + fmt(inc.amount) + ' / ' + inc.frequency + ')?', () => {
    state.incomeEvents = state.incomeEvents.filter(e => e.id !== id);
    refreshFinancialEvents(); saveData();
    showUndoToast('Income event deleted', () => {
      state.incomeEvents.push(inc);
      refreshFinancialEvents(); saveData(); renderIncomeEventList();
    });
    renderIncomeEventList();
  });
}

// ============ GOOGLE CALENDAR OAUTH & API ============

const GCALENDAR_SCOPE = 'https://www.googleapis.com/auth/calendar';
const GCAL_CLIENT_ID = '109256546553-s672aeg8ubkuba2dn7ifrd4g8hkt0kbm.apps.googleusercontent.com';
let gcalTokenClient = null;

function isGoogleSignedIn() {
  return currentUser && currentUser.providerData.some(p => p.providerId === 'google.com');
}
window.isGoogleSignedIn = isGoogleSignedIn;

// Pre-initialize GIS token client so it is ready before user clicks Connect.
// This avoids popup-blocking issues caused by creating the client inside a timer.
function initGcalTokenClient() {
  if (typeof window.google === 'undefined' || !window.google.accounts || !window.google.accounts.oauth2) {
    console.log('GIS not ready yet. typeof google=' + typeof window.google);
    return false;
  }
  if (gcalTokenClient) return true; // already created

  try {
    gcalTokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: GCAL_CLIENT_ID,
      scope: GCALENDAR_SCOPE,
      hint: currentUser ? currentUser.email : '',
      callback: (response) => {
        console.log('GIS callback', response);
        if (response.access_token) {
          state.settings.googleCalendar.connected = true;
          state.settings.googleCalendar.accessToken = response.access_token;
          state.settings.googleCalendar.tokenExpiry = Date.now() + (response.expires_in || 3600) * 1000;
          state.settings.googleCalendar.accountEmail = currentUser ? currentUser.email : '';
          saveData();
          showToast('Google Calendar connected successfully');
          fetchGcalCalendars();
          renderSettings();
        } else if (response.error) {
          console.error('GIS error response', response);
          const msg = response.error_description || response.error;
          if (msg && (msg.includes('popup') || msg.includes('closed') || msg.includes('dismissed'))) {
            showToast('Connection cancelled. Click Connect to try again.');
          } else {
            showToast('Calendar error: ' + msg);
          }
        } else {
          console.error('GIS unknown response', response);
          showToast('Could not get Calendar access. Please try again.');
        }
      },
      error_callback: (err) => {
        console.error('GIS error_callback', err);
        const msg = (err && err.message) ? err.message : '';
        if (msg.includes('popup') || msg.includes('closed') || msg.includes('dismissed')) {
          showToast('Connection cancelled. Click Connect to try again.');
        } else if (msg.includes('network') || msg.includes('timeout')) {
          showToast('Network error. Please check your connection and try again.');
        } else {
          showToast('Calendar permission denied or error: ' + (msg || 'Unknown'));
        }
      }
    });
    console.log('GIS token client initialized');
    return true;
  } catch (e) {
    console.error('GIS initTokenClient threw:', e);
    return false;
  }
}
window.initGcalTokenClient = initGcalTokenClient;

// Fallback: manually inject GIS script if the HTML script tag didn't load
// (common when ad blockers or privacy extensions block accounts.google.com)
function injectGisScript() {
  if (typeof window.google !== 'undefined' && window.google.accounts && window.google.accounts.oauth2) {
    console.log('GIS already available, no injection needed');
    return;
  }
  console.log('Injecting GIS script dynamically...');
  const existing = document.querySelector('script[src*="accounts.google.com/gsi/client"]');
  if (existing) {
    console.log('GIS script tag exists in DOM, waiting for it to load');
    return;
  }
  const s = document.createElement('script');
  s.src = 'https://accounts.google.com/gsi/client';
  s.async = true;
  s.defer = true;
  s.onload = () => { window.__gisLoaded = true; console.log('GIS script injected and loaded'); };
  s.onerror = () => { console.error('GIS script injection failed'); };
  document.head.appendChild(s);
}
window.injectGisScript = injectGisScript;

function connectGoogleCalendar() {
  if (!currentUser) { showToast('Please sign in first'); return; }
  if (!isGoogleSignedIn()) {
    showToast('Please sign in with Google to connect Calendar');
    document.getElementById('gcalSignInNote').style.display = 'block';
    return;
  }
  document.getElementById('gcalSignInNote').style.display = 'none';

  // Try to init client immediately
  if (initGcalTokenClient()) {
    console.log('Requesting access token via GIS...');
    gcalTokenClient.requestAccessToken();
    return;
  }

  // GIS not loaded — use Firebase fallback (re-auth with Calendar scope)
  // This works even when ad blockers or privacy settings block accounts.google.com
  console.log('GIS unavailable, falling back to Firebase re-authentication');
  connectCalendarViaFirebase();
}
window.connectGoogleCalendar = connectGoogleCalendar;

function connectCalendarViaFirebase() {
  try {
    const provider = new firebase.auth.GoogleAuthProvider();
    provider.addScope('https://www.googleapis.com/auth/calendar');
    showToast('Opening Google sign-in to authorize Calendar access...');
    currentUser.reauthenticateWithPopup(provider)
      .then((result) => {
        const credential = result.credential;
        if (credential && credential.accessToken) {
          state.settings.googleCalendar.connected = true;
          state.settings.googleCalendar.accessToken = credential.accessToken;
          // Token from Firebase popup usually expires in 1 hour
          state.settings.googleCalendar.tokenExpiry = Date.now() + 3600 * 1000;
          state.settings.googleCalendar.accountEmail = currentUser.email || '';
          saveData();
          showToast('Google Calendar connected successfully');
          fetchGcalCalendars();
          renderSettings();
        } else {
          console.error('Firebase re-auth succeeded but no accessToken in credential', result);
          showToast('Connected, but could not get Calendar token. Please try again.');
        }
      })
      .catch((err) => {
        console.error('Firebase re-auth error', err);
        if (err.code === 'auth/popup-closed-by-user') {
          showToast('Sign-in cancelled. Click Connect to try again.');
        } else if (err.code === 'auth/popup-blocked') {
          showToast('Popup blocked. Please allow popups for this site and try again.');
        } else if (err.code === 'auth/cancelled-popup-request') {
          showToast('Only one sign-in popup allowed at a time.');
        } else {
          showToast('Could not connect Calendar: ' + (err.message || 'Unknown error'));
        }
      });
  } catch (e) {
    console.error('connectCalendarViaFirebase threw', e);
    showToast('Unable to connect Calendar. Please refresh the page and try again.');
  }
}
window.connectCalendarViaFirebase = connectCalendarViaFirebase;

function disconnectGoogleCalendar() {
  state.settings.googleCalendar.connected = false;
  state.settings.googleCalendar.accessToken = null;
  state.settings.googleCalendar.tokenExpiry = null;
  state.settings.googleCalendar.calendarId = null;
  state.settings.googleCalendar.calendars = [];
  state.financialEvents.forEach(e => { e.gcalEventId = null; });
  state.subscriptions.forEach(s => { s.gcalEventId = null; });
  state.incomeEvents.forEach(i => { i.gcalEventId = null; });
  saveData(); showToast('Google Calendar disconnected'); renderSettings();
}
window.disconnectGoogleCalendar = disconnectGoogleCalendar;

function getGcalAccessToken() {
  const g = state.settings.googleCalendar;
  if (!g.connected) return null;
  if (g.tokenExpiry && Date.now() > g.tokenExpiry) {
    // Token expired — auto disconnect so user can reconnect
    state.settings.googleCalendar.connected = false;
    state.settings.googleCalendar.accessToken = null;
    state.settings.googleCalendar.tokenExpiry = null;
    saveData();
    showToast('Google Calendar connection expired. Please reconnect.');
    return null;
  }
  return g.accessToken;
}

async function fetchGcalCalendars() {
  const token = getGcalAccessToken(); if (!token) return;
  try {
    const resp = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList', { headers: { 'Authorization': 'Bearer ' + token } });
    if (!resp.ok) throw new Error('Failed');
    const data = await resp.json();
    state.settings.googleCalendar.calendars = (data.items||[]).map(c => ({ id: c.id, summary: c.summary }));
    if (!state.settings.googleCalendar.calendarId && state.settings.googleCalendar.calendars.length > 0) state.settings.googleCalendar.calendarId = state.settings.googleCalendar.calendars[0].id;
    saveData(); renderSettings();
  } catch(e) { showToast('Could not fetch calendars'); }
}

function changeGcalCalendar() { state.settings.googleCalendar.calendarId = document.getElementById('gcalSelect').value; saveData(); showToast('Default calendar updated'); }

function buildGcalEvent(event) {
  const sign = event.type==='income'?'+':'\u2212';
  let dateStr;
  try {
    dateStr = new Date(event.date).toISOString().split('T')[0];
  } catch(e) {
    dateStr = new Date().toISOString().split('T')[0];
  }
  const reminderDays = event.reminderDays !== null ? event.reminderDays : state.settings.defaultReminder;
  return {
    summary: event.title+' \u2014 '+sign+fmt(event.amount),
    description: event.title+'\nAmount: '+fmt(event.amount)+'\nCategory: '+event.category+'\nRecurrence: '+event.recurrence+'\n\nScheduled via FinanceOS',
    start: { date: dateStr }, end: { date: dateStr },
    reminders: reminderDays > 0 ? { useDefault: false, overrides: [{ method: 'popup', minutes: reminderDays * 24 * 60 }] } : { useDefault: false }
  };
}

async function syncEventToGcal(eventId) {
  const token = getGcalAccessToken(); if (!token) { showToast('Google Calendar not connected'); return; }
  const event = state.financialEvents.find(e => e.id === eventId); if (!event) return;
  const calId = state.settings.googleCalendar.calendarId || 'primary';
  try {
    const resp = await fetch('https://www.googleapis.com/calendar/v3/calendars/'+encodeURIComponent(calId)+'/events', { method: 'POST', headers: { 'Authorization': 'Bearer '+token, 'Content-Type': 'application/json' }, body: JSON.stringify(buildGcalEvent(event)) });
    if (!resp.ok) throw new Error('failed');
    const data = await resp.json(); event.gcalEventId = data.id; saveData();
    showToast('Event synced to Google Calendar');
  } catch(e) { showToast('Calendar sync couldn\'t be completed. Your financial record has been saved.'); }
}

async function deleteGcalEvent(gcalEventId) {
  const token = getGcalAccessToken(); if (!token) return;
  const calId = state.settings.googleCalendar.calendarId || 'primary';
  try { await fetch('https://www.googleapis.com/calendar/v3/calendars/'+encodeURIComponent(calId)+'/events/'+encodeURIComponent(gcalEventId), { method: 'DELETE', headers: { 'Authorization': 'Bearer '+token } }); } catch(e) {}
}

async function updateGcalEvent(event) {
  const token = getGcalAccessToken(); if (!token || !event.gcalEventId) return;
  const calId = state.settings.googleCalendar.calendarId || 'primary';
  try { await fetch('https://www.googleapis.com/calendar/v3/calendars/'+encodeURIComponent(calId)+'/events/'+encodeURIComponent(event.gcalEventId), { method: 'PUT', headers: { 'Authorization': 'Bearer '+token, 'Content-Type': 'application/json' }, body: JSON.stringify(buildGcalEvent(event)) }); } catch(e) { showToast('Calendar sync update failed. Financial record saved.'); }
}

async function syncAllToGcal() {
  const token = getGcalAccessToken();
  if (!token) { showToast('Google Calendar not connected'); return; }

  const calId = state.settings.googleCalendar.calendarId || 'primary';
  let success = 0, failed = 0;

  // Build list of everything to sync
  const items = [];

  // Financial events
  state.financialEvents.forEach(e => {
    if (e.syncToGcal && !e.gcalEventId && e.status !== 'cancelled') items.push({ type: 'event', data: e });
  });

  // Subscriptions
  state.subscriptions.forEach(s => {
    if (s.syncToGcal && !s.gcalEventId) items.push({ type: 'subscription', data: s });
  });

  // Income events
  state.incomeEvents.forEach(i => {
    if (i.syncToGcal && !i.gcalEventId) items.push({ type: 'income', data: i });
  });

  if (items.length === 0) { showToast('All events are already synced'); return; }

  for (const item of items) {
    try {
      let body;
      if (item.type === 'subscription') {
        body = {
          summary: item.data.name+' renewal — '+fmt(item.data.cost),
          description: item.data.name+' subscription\nAmount: '+fmt(item.data.cost)+'\nCategory: '+item.data.category+'\nRecurrence: '+item.data.cycle+'\n\nScheduled via FinanceOS',
          start: { date: item.data.renewal }, end: { date: item.data.renewal },
          reminders: state.settings.defaultReminder > 0 ? { useDefault: false, overrides: [{ method: 'popup', minutes: state.settings.defaultReminder * 24 * 60 }] } : { useDefault: false }
        };
      } else if (item.type === 'income') {
        body = {
          summary: item.data.name+' — +'+fmt(item.data.amount),
          description: item.data.name+'\nAmount: '+fmt(item.data.amount)+'\nCategory: '+item.data.category+'\nRecurrence: '+item.data.frequency+'\n\nScheduled via FinanceOS',
          start: { date: item.data.nextDate }, end: { date: item.data.nextDate },
          reminders: state.settings.defaultReminder > 0 ? { useDefault: false, overrides: [{ method: 'popup', minutes: state.settings.defaultReminder * 24 * 60 }] } : { useDefault: false }
        };
      } else {
        body = buildGcalEvent(item.data);
      }

      const resp = await fetch('https://www.googleapis.com/calendar/v3/calendars/'+encodeURIComponent(calId)+'/events', { method: 'POST', headers: { 'Authorization': 'Bearer '+token, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (resp.ok) {
        const data = await resp.json();
        item.data.gcalEventId = data.id;
        success++;
      } else {
        const errData = await resp.json().catch(() => ({}));
        console.error('Calendar sync failed:', resp.status, errData);
        failed++;
      }
    } catch(e) {
      console.error('Calendar sync error for item:', e);
      failed++;
    }
  }

  saveData();
  if (success > 0 && failed === 0) {
    showToast(success + ' events synced to Google Calendar successfully');
  } else if (success > 0 && failed > 0) {
    showToast(success + ' synced, ' + failed + ' failed. Check console for details.');
  } else {
    showToast('Calendar sync failed. Please reconnect Google Calendar in Settings.');
  }
}
window.syncAllToGcal = syncAllToGcal;

async function syncIncomeEventToGcal(inc) {
  const token = getGcalAccessToken(); if (!token) return;
  const calId = state.settings.googleCalendar.calendarId || 'primary';
  const gcalEvent = { summary: inc.name+' \u2014 +'+fmt(inc.amount), description: inc.name+'\nAmount: '+fmt(inc.amount)+'\nCategory: '+inc.category+'\nRecurrence: '+inc.frequency+'\n\nScheduled via FinanceOS', start: { date: inc.nextDate }, end: { date: inc.nextDate }, reminders: state.settings.defaultReminder > 0 ? { useDefault: false, overrides: [{ method: 'popup', minutes: state.settings.defaultReminder * 24 * 60 }] } : { useDefault: false } };
  try {
    const resp = await fetch('https://www.googleapis.com/calendar/v3/calendars/'+encodeURIComponent(calId)+'/events', { method: 'POST', headers: { 'Authorization': 'Bearer '+token, 'Content-Type': 'application/json' }, body: JSON.stringify(gcalEvent) });
    if (resp.ok) { const data = await resp.json(); inc.gcalEventId = data.id; saveData(); }
  } catch(e) { showToast('Calendar sync couldn\'t be completed. Income event saved.'); }
}

function syncSubscriptionToGcal(sub) {
  if (!sub.syncToGcal || !state.settings.googleCalendar.connected) return;
  const token = getGcalAccessToken(); if (!token) return;
  const calId = state.settings.googleCalendar.calendarId || 'primary';
  const gcalEvent = { summary: sub.name+' renewal \u2014 \u2212'+fmt(sub.cost), description: sub.name+' subscription\nAmount: '+fmt(sub.cost)+'\nCategory: '+sub.category+'\nRecurrence: '+sub.cycle+'\n\nScheduled via FinanceOS', start: { date: sub.renewal }, end: { date: sub.renewal }, reminders: state.settings.defaultReminder > 0 ? { useDefault: false, overrides: [{ method: 'popup', minutes: state.settings.defaultReminder * 24 * 60 }] } : { useDefault: false } };
  fetch('https://www.googleapis.com/calendar/v3/calendars/'+encodeURIComponent(calId)+'/events', { method: 'POST', headers: { 'Authorization': 'Bearer '+token, 'Content-Type': 'application/json' }, body: JSON.stringify(gcalEvent) }).then(r => r.json()).then(data => { if (data.id) { sub.gcalEventId = data.id; saveData(); } }).catch(() => { showToast('Calendar sync couldn\'t be completed. Subscription saved.'); });
}

// ============ DARK MODE ============
function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  const newTheme = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', newTheme);
  localStorage.setItem('finance_os_theme', newTheme);
  updateThemeIcon(newTheme);
  refreshChartColors();
  const ap = document.querySelector('.page.active');
  if (ap) {
    const page = ap.id.replace('page-','');
    navigate(page);
  }
}

function updateThemeIcon(theme) {
  const icon = document.getElementById('themeIcon');
  if (!icon) return;
  if (theme === 'dark') {
    icon.innerHTML = '<path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>';
  } else {
    icon.innerHTML = '<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>';
  }
}

function initTheme() {
  const saved = localStorage.getItem('finance_os_theme') || 'light';
  document.documentElement.setAttribute('data-theme', saved);
  updateThemeIcon(saved);
  if (saved === 'dark') refreshChartColors();
}

// ============ MOBILE NAVIGATION ============

function openMobileMore() {
  document.getElementById('mobileMoreSheet').classList.add('active');
  document.getElementById('mobileMoreOverlay').classList.add('active');
}

function closeMobileMore() {
  document.getElementById('mobileMoreSheet').classList.remove('active');
  document.getElementById('mobileMoreOverlay').classList.remove('active');
}

function setMobileTxFilter(filter) {
  document.getElementById('txFilterType').value = filter;
  document.querySelectorAll('.mobile-tx-tab').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.filter === filter);
  });
  renderTransactions();
}

// ============ ONBOARDING ============
let onboardingStep = 0;
const onboardingSteps = 5;

function renderOnboardingProgress() {
  const container = document.getElementById('onboardingProgress');
  container.innerHTML = '';
  for (let i = 0; i < onboardingSteps; i++) {
    const dot = document.createElement('div');
    dot.className = 'onboarding-dot' + (i === onboardingStep ? ' active' : '');
    container.appendChild(dot);
  }
}

function showOnboardingStep(step) {
  onboardingStep = step;
  document.querySelectorAll('.onboarding-step').forEach(s => s.classList.remove('active'));
  const stepEl = document.querySelector('.onboarding-step[data-step="' + step + '"]');
  if (stepEl) stepEl.classList.add('active');
  renderOnboardingProgress();
}

let onbAccounts = [];

function addOnbAccount() {
  const name = document.getElementById('onbAccountName').value.trim();
  const balance = parseFloat(document.getElementById('onbAccountBalance').value) || 0;
  if (!name) { showToast('Enter an account name'); return; }
  onbAccounts.push({ id: uid(), name, balance });
  document.getElementById('onbAccountName').value = '';
  document.getElementById('onbAccountBalance').value = '';
  renderOnbAccountChips();
}

function renderOnbAccountChips() {
  const container = document.getElementById('onbAccountChips');
  if (!container) return;
  container.innerHTML = onbAccounts.map(a => '<div class="onb-chip selected" style="cursor:default;">' + a.name + ' — ' + fmt(a.balance) + '</div>').join('');
}

function onboardingNext() {
  if (onboardingStep === 1) {
    const curSelect = document.getElementById('onbCurrency');
    if (!state.profile) state.profile = {};
    state.profile.currency = curSelect.value;
    state.profile.currencyCode = curSelect.options[curSelect.selectedIndex].dataset.code;
    // Save income sources
    const incomeChips = document.querySelectorAll('.onb-chip[data-income].selected');
    state.profile.incomeSources = [...incomeChips].map(c => c.dataset.income);
    // Save salary date if provided
    const salaryDateSelect = document.getElementById('onbSalaryDate');
    if (salaryDateSelect && salaryDateSelect.value) {
      if (salaryDateSelect.value === 'custom') {
        const customDay = document.getElementById('onbSalaryCustomDay').value;
        state.profile.salaryDay = customDay ? parseInt(customDay) : null;
      } else {
        state.profile.salaryDay = parseInt(salaryDateSelect.value);
      }
    }
    saveData();
  } else if (onboardingStep === 2) {
    // Save accounts
    if (onbAccounts.length > 0) {
      state.accounts = onbAccounts;
      saveData();
    }
  } else if (onboardingStep === 3) {
    // Save selected categories
    const catChips = document.querySelectorAll('.onb-chip[data-cat].selected');
    const selectedCats = [...catChips].map(c => c.dataset.cat);
    if (selectedCats.length > 0) state.profile.expenseCategories = selectedCats;
    // Save budgets if set
    const budgetInputs = document.querySelectorAll('.onb-budget-input');
    if (budgetInputs.length > 0) {
      if (!state.budgets) state.budgets = {};
      budgetInputs.forEach(input => {
        const val = parseFloat(input.value);
        if (val > 0) state.budgets[input.dataset.budcat] = val;
      });
    }
    saveData();
  }
  if (onboardingStep < onboardingSteps - 1) showOnboardingStep(onboardingStep + 1);
  else finishOnboarding();
}

function toggleOnbCategory(chip) {
  chip.classList.toggle('selected');
  const selectedCats = [...document.querySelectorAll('.onb-chip[data-cat].selected')].map(c => c.dataset.cat);
  const wrap = document.getElementById('onbBudgetInputs');
  const list = document.getElementById('onbBudgetList');
  if (selectedCats.length === 0) {
    wrap.style.display = 'none';
    return;
  }
  wrap.style.display = 'block';
  const existing = {};
  [...list.querySelectorAll('.onb-budget-input')].forEach(input => { if (input.value) existing[input.dataset.budcat] = input.value; });
  list.innerHTML = selectedCats.map(cat => '<div class="onb-budget-row"><label>' + cat + '</label><input type="number" class="onb-budget-input" data-budcat="' + cat + '" placeholder="0" step="0.01"' + (existing[cat] ? ' value="' + existing[cat] + '"' : '') + '></div>').join('');
}

function skipOnboarding() {
  if (onboardingStep === 1) {
    const curSelect = document.getElementById('onbCurrency');
    if (!state.profile) state.profile = {};
    state.profile.currency = curSelect.value;
    state.profile.currencyCode = curSelect.options[curSelect.selectedIndex].dataset.code;
    saveData();
  }
  if (onboardingStep === 2 && onbAccounts.length > 0) {
    state.accounts = onbAccounts;
    saveData();
  }
  finishOnboarding();
}

function finishOnboarding() {
  state.hasOnboarded = true;
  ensureStateDefaults();
  autoPostRecurring();
  checkAndShowBrowserNotifications();
  saveData();
  document.getElementById('onboardingOverlay').classList.remove('active');
  navigate('dashboard');
}

function startOnboardingIfNeeded() {
  if (!state.hasOnboarded) {
    document.getElementById('onboardingOverlay').classList.add('active');
    onboardingStep = 0;
    showOnboardingStep(0);
    // Salary chip toggle
    document.querySelectorAll('.onb-chip[data-income]').forEach(chip => {
      chip.addEventListener('click', () => {
        const isSalary = chip.dataset.income === 'Salary';
        const wrap = document.getElementById('onbSalaryDateWrap');
        if (isSalary && chip.classList.contains('selected')) wrap.style.display = 'block';
        else if (isSalary) wrap.style.display = 'none';
      });
    });
    // Custom salary day toggle
    document.getElementById('onbSalaryDate').addEventListener('change', function() {
      document.getElementById('onbSalaryCustomDay').style.display = this.value === 'custom' ? 'block' : 'none';
    });
  }
}

// ============ CREATE CALENDAR EVENT ============
let createEventDate = null;
let createEventType = 'expense';

function openCreateEventModal(dateStr) {
  createEventDate = dateStr || new Date().toISOString().split('T')[0];
  createEventType = 'expense';
  document.getElementById('createEventTitle').textContent = 'Create event — ' + fmtDate(createEventDate);
  document.querySelectorAll('#createEventTypeSelector .type-btn').forEach(b => b.classList.toggle('active', b.dataset.etype === 'expense'));
  document.getElementById('createEventName').value = '';
  document.getElementById('createEventAmount').value = '';
  document.getElementById('createEventDate').value = createEventDate;
  document.getElementById('createEventCategory').value = 'Loan Repayment';
  document.getElementById('createEventNotes').value = '';
  populateAccountSelect('createEventAccount', false);
  document.getElementById('toggleCreateEventRecurring').classList.remove('on');
  document.getElementById('createEventRecurringOptions').style.display = 'none';
  document.getElementById('createEventReminder').value = String(state.settings.defaultReminder || 1);
  document.getElementById('createEventCustomReminder').style.display = 'none';
  document.querySelectorAll('#createEventCustomReminder .onb-chip').forEach(c => c.classList.remove('selected'));
  document.getElementById('toggleCreateEventGcal').classList.remove('on');
  document.getElementById('createEventModalOverlay').classList.add('active');
}

function closeCreateEventModal() {
  document.getElementById('createEventModalOverlay').classList.remove('active');
  createEventDate = null;
  editingCalendarEventId = null;
}

document.addEventListener('click', (e) => {
  if (e.target.closest('#createEventTypeSelector .type-btn')) {
    const btn = e.target.closest('.type-btn');
    createEventType = btn.dataset.etype;
    document.querySelectorAll('#createEventTypeSelector .type-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  }
});

document.addEventListener('change', (e) => {
  if (e.target.id === 'createEventReminder') {
    document.getElementById('createEventCustomReminder').style.display = e.target.value === 'custom' ? 'block' : 'none';
  }
});

function saveCreateEvent() {
  const name = document.getElementById('createEventName').value.trim();
  const amount = parseFloat(document.getElementById('createEventAmount').value);
  const date = document.getElementById('createEventDate').value;
  const category = document.getElementById('createEventCategory').value;
  const notes = document.getElementById('createEventNotes').value;
  const isRecurring = document.getElementById('toggleCreateEventRecurring').classList.contains('on');
  const frequency = document.getElementById('createEventFreq').value;
  const syncGcal = document.getElementById('toggleCreateEventGcal').classList.contains('on');
  let reminderDays = null;
  let reminderDaysList = null;
  const reminderSelect = document.getElementById('createEventReminder');
  if (reminderSelect.value === 'custom') {
    reminderDaysList = [...document.querySelectorAll('#createEventCustomReminder .onb-chip.selected')].map(c => parseInt(c.dataset.reminder));
    reminderDays = reminderDaysList.length > 0 ? reminderDaysList.join(',') : null;
  } else {
    reminderDays = parseInt(reminderSelect.value);
  }
  if (!name) { showToast('Enter an event title'); return; }
  if (!amount || amount <= 0) { showToast('Enter a valid amount'); return; }
  if (!date) { showToast('Select a date'); return; }
  const recurrence = isRecurring ? frequency : 'one-time';
  const eventType = createEventType === 'income' ? 'income' : (createEventType === 'savings' ? 'savings' : (createEventType === 'custom' ? 'custom' : 'expense'));

  const accountId = document.getElementById('createEventAccount').value || null;

  if (editingCalendarEventId) {
    const idx = state.financialEvents.findIndex(e => e.id === editingCalendarEventId);
    if (idx >= 0) {
      const ev = state.financialEvents[idx];
      ev.title = name; ev.amount = amount; ev.date = date; ev.category = category;
      ev.notes = notes; ev.recurrence = recurrence; ev.type = eventType;
      ev.status = getEventStatus(date); ev.syncToGcal = syncGcal;
      ev.reminderDays = reminderDays; ev.reminderDaysList = reminderDaysList;
      ev.accountId = accountId;
      saveData();
      if (syncGcal && state.settings.googleCalendar.connected && !ev.gcalEventId) syncEventToGcal(ev.id);
      else if (syncGcal && ev.gcalEventId) updateGcalEvent(ev);
    }
    editingCalendarEventId = null;
    closeCreateEventModal();
    showToast('Event updated');
    renderCalendar();
    return;
  }

  const baseEvent = { type: eventType, title: name, amount: amount, category: category, recurrence: recurrence, status: getEventStatus(date), syncToGcal: syncGcal, gcalEventId: null, sourceId: null, sourceType: 'manual', linkedTxId: null, reminderDays: reminderDays, reminderDaysList: reminderDaysList, notes: notes, accountId: accountId };
  if (isRecurring) {
    const futureDates = getFutureDates(date, frequency, 3);
    futureDates.forEach(d => { state.financialEvents.push({ ...baseEvent, id: uid(), date: d, status: getEventStatus(d) }); });
  } else {
    state.financialEvents.push({ ...baseEvent, id: uid(), date: date });
  }
  state.financialEvents.sort((a,b) => new Date(a.date) - new Date(b.date));
  saveData();
  if (syncGcal && state.settings.googleCalendar.connected) {
    const lastEvent = state.financialEvents[state.financialEvents.length - 1];
    if (lastEvent) syncEventToGcal(lastEvent.id);
  }
  closeCreateEventModal();
  showToast('Event created for ' + fmtDate(date));
  renderCalendar();
}

document.getElementById('createEventModalOverlay').addEventListener('click', (e) => {
  if (e.target === e.currentTarget) closeCreateEventModal();
});

// ============ INIT ============
initTheme();

// Register Service Worker for PWA offline support
if ('serviceWorker' in navigator) {
  window.addEventListener('load', function() {
    navigator.serviceWorker.register('./sw.js')
      .then(function(registration) {
        console.log('ServiceWorker registered with scope:', registration.scope);
      })
      .catch(function(err) {
        console.log('ServiceWorker registration failed:', err);
      });
  });
}

// Background attempts to pre-initialize GIS token client once the library loads.
// We poll gently for 30 seconds so the Connect button is ready immediately.
(function watchGisLoad() {
  let attempts = 0;
  const maxAttempts = 30;
  const timer = setInterval(() => {
    attempts++;
    if (typeof window.google !== 'undefined' && window.google.accounts && window.google.accounts.oauth2) {
      clearInterval(timer);
      console.log('GIS library detected by watcher');
      // Only init if user is already known to be signed in with Google
      if (currentUser && isGoogleSignedIn()) {
        initGcalTokenClient();
      }
      return;
    }
    // After 3 seconds, try dynamic injection as fallback (ad blockers often block the static tag)
    if (attempts === 3) {
      console.log('GIS not loaded after 3s, trying dynamic injection fallback');
      injectGisScript();
    }
    if (attempts >= maxAttempts) {
      clearInterval(timer);
      console.log('GIS library did not load within 30s');
    }
  }, 1000);
})();

// Auto-post recurring items and check notifications when user returns to the app (PWA background resume)
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', function() {
    if (!document.hidden && state && state.hasOnboarded) {
      autoPostRecurring();
      checkAndShowBrowserNotifications();
    }
  });
}

// Landing page scroll-reveal + count-up animations (isolated from app logic)
(function initLandingPage() {
  if (!document.getElementById('landingPage')) return;

  // Scroll reveal
  var revealEls = document.querySelectorAll('.fqlp-reveal');
  if (window.IntersectionObserver) {
    var revealObserver = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    revealEls.forEach(function(el) { revealObserver.observe(el); });
  } else {
    revealEls.forEach(function(el) { el.classList.add('visible'); });
  }

  // Count-up stats
  function countUp(el, target, duration) {
    var start = 0;
    var startTime = null;
    var suffix = el.textContent.replace(/[0-9]/g, '').replace(/,/g, '');
    function step(timestamp) {
      if (!startTime) startTime = timestamp;
      var progress = Math.min((timestamp - startTime) / duration, 1);
      var value = Math.floor(progress * target);
      if (target >= 1000) {
        el.textContent = value.toLocaleString() + suffix;
      } else {
        el.textContent = value + suffix;
      }
      if (progress < 1) {
        window.requestAnimationFrame(step);
      } else {
        if (target >= 1000) {
          el.textContent = target.toLocaleString() + suffix;
        } else {
          el.textContent = target + suffix;
        }
      }
    }
    window.requestAnimationFrame(step);
  }

  var statEls = document.querySelectorAll('.fqlp-stat-num[data-count]');
  if (window.IntersectionObserver) {
    var countObserver = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        if (entry.isIntersecting) {
          var el = entry.target;
          var target = parseInt(el.dataset.count, 10);
          var suffixEl = el.querySelector('.accent');
          var suffix = suffixEl ? suffixEl.outerHTML : '';
          el.innerHTML = '0' + suffix;
          countUp(el, target, 1800);
          countObserver.unobserve(el);
        }
      });
    }, { threshold: 0.3 });
    statEls.forEach(function(el) { countObserver.observe(el); });
  } else {
    statEls.forEach(function(el) {
      var target = parseInt(el.dataset.count, 10);
      var suffixEl = el.querySelector('.accent');
      var suffix = suffixEl ? suffixEl.outerHTML : '';
      el.innerHTML = target.toLocaleString() + suffix;
    });
  }
})();

// Auth listener handles loadData, navigate, and onboarding flow
} catch(e) {
  document.body.innerHTML = '<div style="padding:40px;font-family:sans-serif;background:#fff;color:#333;"><h2 style="color:#c00">Startup Error</h2><p><b>' + e.message + '</b></p><pre style="background:#f5f5f5;padding:12px;border-radius:8px;overflow:auto;font-size:12px;">' + (e.stack || 'No stack') + '</pre><p style="margin-top:20px;color:#666">Please screenshot this and share it so I can fix it.</p></div>';
}
