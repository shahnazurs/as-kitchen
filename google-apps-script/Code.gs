// ════════════════════════════════════════════════════════════
//  A's Kitchen — Google Apps Script Backend
//  Deploy as Web App: Execute as "Me", Access "Anyone"
// ════════════════════════════════════════════════════════════

const SHEET_ID   = '14cJHDFbsSACNXx18fsjKOyX30zwNS-REgbNnDDsY-G0';
const MENU_TAB   = 'Menu';
const ORDERS_TAB = 'Orders';

const MENU_COLS  = ['id','name','desc','price','emoji','cat','tag','spicy','available','image'];
const ORDER_COLS = ['id','name','email','phone','address','date','time','items','total','notes','status','placedAt'];

// ════════════════════════════════
//  ROUTER — supports JSONP via ?callback=
// ════════════════════════════════
function doGet(e) {
  const action   = e.parameter.action;
  const callback = e.parameter.callback; // JSONP callback name
  const payload  = e.parameter.payload ? JSON.parse(decodeURIComponent(e.parameter.payload)) : {};

  let result;
  try {
    if (action === 'getMenu')        result = ok(getMenu());
    else if (action === 'getOrders') result = ok(getOrders());
    else if (action === 'saveMenuItem')   result = ok(saveMenuItem(payload.item));
    else if (action === 'deleteMenuItem') result = ok(deleteMenuItem(payload.id));
    else if (action === 'placeOrder')     result = ok(placeOrder(payload.order));
    else if (action === 'updateOrder')    result = ok(updateOrder(payload.id, payload.status));
    else if (action === 'deleteOrder')    result = ok(deleteOrder(payload.id));
    else result = { ok: false, error: 'Unknown action: ' + action };
  } catch(ex) {
    result = { ok: false, error: ex.toString() };
  }

  const json = JSON.stringify(result);

  // If JSONP requested, wrap in callback
  if (callback) {
    return ContentService
      .createTextOutput(callback + '(' + json + ')')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }

  return ContentService
    .createTextOutput(json)
    .setMimeType(ContentService.MimeType.JSON);
}

// ════════════════════════════════
//  HELPERS
// ════════════════════════════════
function ok(data)  { return { ok: true,  data }; }
function err(msg)  { return { ok: false, error: msg }; }

function getSheet(name) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
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
  const rows = sheetToObjects(getSheet(MENU_TAB), MENU_COLS);
  return rows.map(r => ({
    id:        Number(r.id),
    name:      String(r.name),
    desc:      String(r.desc),
    price:     Number(r.price),
    emoji:     String(r.emoji),
    cat:       String(r.cat),
    tag:       String(r.tag),
    spicy:     r.spicy === 'true' || r.spicy === true,
    available: r.available !== 'false' && r.available !== false,
    image:     String(r.image || '')
  }));
}

function saveMenuItem(item) {
  const sheet = getSheet(MENU_TAB);
  const rows  = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) === String(item.id)) {
      sheet.getRange(i + 1, 1, 1, MENU_COLS.length).setValues([objectToRow(item, MENU_COLS)]);
      return { action: 'updated', id: item.id };
    }
  }
  if (!item.id) {
    const ids = rows.slice(1).map(r => Number(r[0])).filter(Boolean);
    item.id = ids.length ? Math.max(...ids) + 1 : 1;
  }
  sheet.appendRow(objectToRow(item, MENU_COLS));
  return { action: 'created', id: item.id };
}

function deleteMenuItem(id) {
  const sheet = getSheet(MENU_TAB);
  const rows  = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) === String(id)) {
      sheet.deleteRow(i + 1);
      return { deleted: id };
    }
  }
  return { notFound: id };
}

// ════════════════════════════════
//  ORDERS
// ════════════════════════════════
function getOrders() {
  const rows = sheetToObjects(getSheet(ORDERS_TAB), ORDER_COLS);
  return rows.map(r => ({
    ...r,
    total: Number(r.total),
    items: (() => { try { return JSON.parse(r.items); } catch(e) { return []; } })()
  }));
}

function placeOrder(order) {
  const sheet    = getSheet(ORDERS_TAB);
  order.placedAt = new Date().toISOString();
  order.status   = 'New';
  sheet.appendRow(objectToRow({ ...order, items: JSON.stringify(order.items) }, ORDER_COLS));
  try {
    MailApp.sendEmail({
      to:       Session.getEffectiveUser().getEmail(),
      subject:  '🍽️ New Order #' + order.id + ' from ' + order.name + ' — A\'s Kitchen',
      htmlBody: buildOrderEmail(order)
    });
  } catch(e) { console.log('Email failed:', e); }
  return { saved: true, id: order.id };
}

function updateOrder(id, status) {
  const sheet     = getSheet(ORDERS_TAB);
  const rows      = sheet.getDataRange().getValues();
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
  const rows  = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) === String(id)) {
      sheet.deleteRow(i + 1);
      return { deleted: id };
    }
  }
  return { notFound: id };
}

// ════════════════════════════════
//  EMAIL
// ════════════════════════════════
function buildOrderEmail(order) {
  const items = (order.items || []).map(i =>
    '<tr><td style="padding:6px 12px">' + i.name + '</td><td style="padding:6px 12px;text-align:right">$' + Number(i.price).toFixed(2) + '</td></tr>'
  ).join('');
  return '<div style="font-family:sans-serif;max-width:560px;margin:0 auto">'
    + '<div style="background:#1A0F08;padding:24px 32px;border-radius:12px 12px 0 0"><h1 style="color:#fff;margin:0">🍽️ New Order — A\'s Kitchen</h1></div>'
    + '<div style="background:#fff;padding:28px 32px;border:1px solid #E8D5C0;border-radius:0 0 12px 12px">'
    + '<p><strong>Order:</strong> #' + order.id + '</p>'
    + '<p><strong>Customer:</strong> ' + order.name + '</p>'
    + '<p><strong>Email:</strong> ' + order.email + '</p>'
    + '<p><strong>Phone:</strong> ' + order.phone + '</p>'
    + '<p><strong>Address:</strong> ' + order.address + '</p>'
    + '<p><strong>Delivery:</strong> ' + order.date + ' at ' + order.time + '</p>'
    + '<table style="width:100%;border-collapse:collapse;margin-top:16px">'
    + '<tr style="background:#1A0F08;color:#fff"><th style="padding:8px 12px;text-align:left">Item</th><th style="padding:8px 12px;text-align:right">Price</th></tr>'
    + items
    + '<tr><td style="padding:10px 12px;font-weight:700">Total</td><td style="padding:10px 12px;text-align:right;font-weight:700;color:#C8460A">$' + Number(order.total).toFixed(2) + '</td></tr>'
    + '</table>'
    + (order.notes ? '<p style="margin-top:16px"><strong>Notes:</strong> ' + order.notes + '</p>' : '')
    + '</div></div>';
}
