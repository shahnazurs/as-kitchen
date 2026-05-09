// ════════════════════════════════════════════════════════════
//  A's Kitchen — Google Apps Script Backend
//  Paste this entire file into script.google.com
//  Deploy as Web App: Execute as "Me", Access "Anyone"
// ════════════════════════════════════════════════════════════

const SHEET_ID   = 'YOUR_GOOGLE_SHEET_ID_HERE'; // ← paste your Sheet ID
const MENU_TAB   = 'Menu';
const ORDERS_TAB = 'Orders';

// ── Column definitions ──
const MENU_COLS   = ['id','name','desc','price','emoji','cat','tag','spicy','available','image'];
const ORDER_COLS  = ['id','name','email','phone','address','date','time','items','total','notes','status','placedAt'];

// ════════════════════════════════
//  ROUTER
// ════════════════════════════════
function doGet(e) {
  const action = e.parameter.action;
  try {
    if (action === 'getMenu')   return ok(getMenu());
    if (action === 'getOrders') return ok(getOrders());
    return err('Unknown action: ' + action);
  } catch(ex) {
    return err(ex.toString());
  }
}

function doPost(e) {
  const body = JSON.parse(e.postData.contents);
  const action = body.action;
  try {
    if (action === 'saveMenu')      return ok(saveMenu(body.menu));
    if (action === 'saveMenuItem')  return ok(saveMenuItem(body.item));
    if (action === 'deleteMenuItem')return ok(deleteMenuItem(body.id));
    if (action === 'placeOrder')    return ok(placeOrder(body.order));
    if (action === 'updateOrder')   return ok(updateOrder(body.id, body.status));
    if (action === 'deleteOrder')   return ok(deleteOrder(body.id));
    return err('Unknown action: ' + action);
  } catch(ex) {
    return err(ex.toString());
  }
}

// ════════════════════════════════
//  HELPERS
// ════════════════════════════════
function ok(data) {
  return ContentService
    .createTextOutput(JSON.stringify({ ok: true, data }))
    .setMimeType(ContentService.MimeType.JSON);
}
function err(msg) {
  return ContentService
    .createTextOutput(JSON.stringify({ ok: false, error: msg }))
    .setMimeType(ContentService.MimeType.JSON);
}
function getSheet(name) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    // Write headers
    const headers = name === MENU_TAB ? MENU_COLS : ORDER_COLS;
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length)
      .setBackground('#1A0F08').setFontColor('#ffffff').setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  return sheet;
}
function sheetToObjects(sheet, cols) {
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  const headers = data[0];
  return data.slice(1).map(row => {
    const obj = {};
    cols.forEach((col, i) => obj[col] = row[i] !== undefined ? row[i] : '');
    return obj;
  });
}
function objectToRow(obj, cols) {
  return cols.map(col => {
    const v = obj[col];
    if (v === undefined || v === null) return '';
    if (typeof v === 'object') return JSON.stringify(v);
    return v;
  });
}

// ════════════════════════════════
//  MENU
// ════════════════════════════════
function getMenu() {
  const sheet = getSheet(MENU_TAB);
  const rows = sheetToObjects(sheet, MENU_COLS);
  return rows.map(r => ({
    id:        Number(r.id),
    name:      r.name,
    desc:      r.desc,
    price:     Number(r.price),
    emoji:     r.emoji,
    cat:       r.cat,
    tag:       r.tag,
    spicy:     r.spicy === 'true' || r.spicy === true,
    available: r.available !== 'false' && r.available !== false,
    image:     r.image || ''
  }));
}

function saveMenuItem(item) {
  const sheet = getSheet(MENU_TAB);
  const rows = sheet.getDataRange().getValues();

  // Find existing row by id (skip header row)
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) === String(item.id)) {
      sheet.getRange(i + 1, 1, 1, MENU_COLS.length)
        .setValues([objectToRow(item, MENU_COLS)]);
      return { action: 'updated', id: item.id };
    }
  }
  // New item — assign ID if missing
  if (!item.id) {
    const ids = rows.slice(1).map(r => Number(r[0])).filter(Boolean);
    item.id = ids.length ? Math.max(...ids) + 1 : 1;
  }
  sheet.appendRow(objectToRow(item, MENU_COLS));
  return { action: 'created', id: item.id };
}

function deleteMenuItem(id) {
  const sheet = getSheet(MENU_TAB);
  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) === String(id)) {
      sheet.deleteRow(i + 1);
      return { deleted: id };
    }
  }
  return { notFound: id };
}

function saveMenu(menuArray) {
  // Full menu overwrite (used for bulk import)
  const sheet = getSheet(MENU_TAB);
  const lastRow = sheet.getLastRow();
  if (lastRow > 1) sheet.deleteRows(2, lastRow - 1);
  if (menuArray.length) {
    sheet.getRange(2, 1, menuArray.length, MENU_COLS.length)
      .setValues(menuArray.map(item => objectToRow(item, MENU_COLS)));
  }
  return { saved: menuArray.length };
}

// ════════════════════════════════
//  ORDERS
// ════════════════════════════════
function getOrders() {
  const sheet = getSheet(ORDERS_TAB);
  const rows = sheetToObjects(sheet, ORDER_COLS);
  return rows.map(r => ({
    ...r,
    total: Number(r.total),
    items: (() => { try { return JSON.parse(r.items); } catch(e) { return []; } })()
  }));
}

function placeOrder(order) {
  const sheet = getSheet(ORDERS_TAB);
  order.placedAt = new Date().toISOString();
  order.status   = order.status || 'New';
  // Serialize items array to JSON string for storage
  const row = objectToRow({
    ...order,
    items: JSON.stringify(order.items)
  }, ORDER_COLS);
  sheet.appendRow(row);

  // Email notification to admin
  try {
    MailApp.sendEmail({
      to: Session.getEffectiveUser().getEmail(),
      subject: `🍽️ New Order #${order.id} from ${order.name} — A's Kitchen`,
      htmlBody: buildOrderEmail(order)
    });
  } catch(e) {
    // Email failed — order still saved
    console.log('Email failed:', e);
  }

  return { saved: true, id: order.id };
}

function updateOrder(id, status) {
  const sheet = getSheet(ORDERS_TAB);
  const rows = sheet.getDataRange().getValues();
  const statusCol = ORDER_COLS.indexOf('status') + 1;
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) === String(id)) {
      sheet.getRange(i + 1, statusCol).setValue(status);
      return { updated: id, status };
    }
  }
  return { notFound: id };
}

function deleteOrder(id) {
  const sheet = getSheet(ORDERS_TAB);
  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) === String(id)) {
      sheet.deleteRow(i + 1);
      return { deleted: id };
    }
  }
  return { notFound: id };
}

// ════════════════════════════════
//  EMAIL TEMPLATE
// ════════════════════════════════
function buildOrderEmail(order) {
  const items = (order.items || []).map(i =>
    `<tr><td style="padding:6px 12px">${i.name}</td><td style="padding:6px 12px;text-align:right">$${Number(i.price).toFixed(2)}</td></tr>`
  ).join('');
  return `
  <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#2A1810">
    <div style="background:#1A0F08;padding:24px 32px;border-radius:12px 12px 0 0">
      <h1 style="color:#fff;margin:0;font-size:1.4rem">🍽️ New Order — A's Kitchen</h1>
    </div>
    <div style="background:#fff;padding:28px 32px;border:1px solid #E8D5C0;border-top:none;border-radius:0 0 12px 12px">
      <table style="width:100%;border-collapse:collapse;margin-bottom:20px">
        <tr><td style="padding:6px 0;color:#7A5A48;font-size:.85rem">Order ID</td><td style="font-weight:700;color:#C8460A">#${order.id}</td></tr>
        <tr><td style="padding:6px 0;color:#7A5A48;font-size:.85rem">Customer</td><td>${order.name}</td></tr>
        <tr><td style="padding:6px 0;color:#7A5A48;font-size:.85rem">Email</td><td>${order.email}</td></tr>
        <tr><td style="padding:6px 0;color:#7A5A48;font-size:.85rem">Phone</td><td>${order.phone}</td></tr>
        <tr><td style="padding:6px 0;color:#7A5A48;font-size:.85rem">Address</td><td>${order.address}</td></tr>
        <tr><td style="padding:6px 0;color:#7A5A48;font-size:.85rem">Delivery</td><td>${order.date} at ${order.time}</td></tr>
      </table>
      <table style="width:100%;border-collapse:collapse;background:#FAF6F0;border-radius:8px;overflow:hidden">
        <tr style="background:#1A0F08;color:#fff"><th style="padding:8px 12px;text-align:left">Item</th><th style="padding:8px 12px;text-align:right">Price</th></tr>
        ${items}
        <tr style="border-top:2px solid #E8D5C0"><td style="padding:10px 12px;font-weight:700">Total</td><td style="padding:10px 12px;text-align:right;font-weight:700;color:#C8460A">$${Number(order.total).toFixed(2)}</td></tr>
      </table>
      ${order.notes ? `<div style="margin-top:16px;padding:12px;background:#FEF3E2;border-radius:8px"><strong>Notes:</strong> ${order.notes}</div>` : ''}
    </div>
  </div>`;
}
