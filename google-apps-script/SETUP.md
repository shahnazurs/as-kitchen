# Google Sheets Setup Guide for A's Kitchen

Follow these steps once — takes about 10 minutes.

---

## Step 1: Create the Google Sheet

1. Go to https://sheets.google.com and create a new spreadsheet
2. Name it **A's Kitchen**
3. Copy the Sheet ID from the URL:
   ```
   https://docs.google.com/spreadsheets/d/THIS_IS_YOUR_SHEET_ID/edit
   ```

---

## Step 2: Set Up Apps Script

1. In your Google Sheet, click **Extensions → Apps Script**
2. Delete any existing code in the editor
3. Open the file `google-apps-script/Code.gs` from this project
4. Paste the entire contents into the Apps Script editor
5. On **line 7**, replace `YOUR_GOOGLE_SHEET_ID_HERE` with your actual Sheet ID:
   ```javascript
   const SHEET_ID = '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms'; // example
   ```
6. Click **Save** (💾)

---

## Step 3: Deploy as Web App

1. Click **Deploy → New deployment**
2. Click the gear icon ⚙️ next to "Type" and select **Web app**
3. Set:
   - **Description**: A's Kitchen API
   - **Execute as**: Me
   - **Who has access**: Anyone
4. Click **Deploy**
5. Click **Authorize access** → choose your Google account → Allow
6. **Copy the Web App URL** — it looks like:
   ```
   https://script.google.com/macros/s/AKfycb.../exec
   ```

---

## Step 4: Add the URL to Your Website Files

Open **both** of these files and replace `YOUR_APPS_SCRIPT_URL_HERE`:

### In `index.html` (around line 864):
```javascript
const SCRIPT_URL = 'https://script.google.com/macros/s/YOUR_ID/exec';
```

### In `admin/index.html` (around line 10 of the script):
```javascript
const SCRIPT_URL = 'https://script.google.com/macros/s/YOUR_ID/exec';
```

Save both files and push to GitHub.

---

## Step 5: Initialize the Sheet Tabs

1. Open your live site's admin panel
2. The Orders and Menu tabs will automatically create the correct sheet structure on first load
3. You'll see two tabs appear in your Google Sheet: **Menu** and **Orders**

---

## Step 6: Import Your Existing Menu (Optional)

If you want to pre-populate the menu, go to Admin → Menu Manager → Add New Item for each dish,
or manually add rows to the **Menu** tab in Google Sheets with these columns:

```
id | name | desc | price | emoji | cat | tag | spicy | available | image
```

---

## How It Works

| Action | What happens |
|---|---|
| Customer views menu | Fetches Menu tab from Google Sheets |
| Customer places order | Writes to Orders tab + emails you |
| Admin edits menu item | Updates Menu tab in Google Sheets |
| Admin updates order status | Updates Orders tab in Google Sheets |
| You open Google Sheets | See all orders and menu live |

---

## Email Notifications

Order confirmation emails are sent automatically to the Google account that owns the Apps Script.
To send to a different email, edit line in `Code.gs`:
```javascript
to: 'your-kitchen-email@gmail.com', // change this
```
Then re-deploy: **Deploy → Manage deployments → Edit → Deploy**

---

## Troubleshooting

**"Could not load menu/orders"**
- Check SCRIPT_URL is correct in both HTML files
- Make sure you deployed as "Anyone" can access
- Try re-deploying the Apps Script (Deploy → Manage deployments)

**CORS errors in browser console**
- Re-deploy the Apps Script — this usually fixes it
- Make sure "Who has access" is set to "Anyone" (not "Anyone with Google account")

**Changes not reflecting**
- Apps Script caches responses for ~30s. Hard refresh the page (Ctrl+Shift+R)
- Or add `?cachebust=`+Date.now() to your fetch URL (already handled in the code)
