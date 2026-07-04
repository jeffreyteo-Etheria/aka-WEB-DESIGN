/**
 * AKA Digital — Lead & Career Webhook (Google Apps Script)
 *
 * Receives POSTs from the website's contact form (src/contact.njk) and the
 * careers application form (src/careers.njk). Logs each submission to a tab
 * in the bound Google Sheet and emails a notification:
 *   - Leads   → the assigned market contact, cc'd to Hello@akadigital.net
 *   - Careers → Hello@akadigital.net directly
 *
 * SETUP
 * 1. Open the Google Sheet used for CRM tracking (the one at
 *    settings.google_sheet_url) → Extensions → Apps Script.
 * 2. If a script already exists there, back it up first (File → Make a copy,
 *    or copy the code into a text file) before replacing it — this file is a
 *    full rewrite, not a patch.
 * 3. Paste this in as Code.gs.
 * 4. Deploy → Manage deployments → Edit (pencil icon) → New version → Deploy.
 *    Editing the code alone does NOT update the live /exec URL — you must
 *    push a new version from the EXISTING deployment so the URL already
 *    stored in src/_data/settings.json (google_sheets_webhook) keeps working.
 * 5. MailApp.sendEmail sends "From" the Google account that owns/deployed
 *    this script — not literally from Hello@ or jeffrey.teo@ unless that IS
 *    the deploying account or a verified alias of it. If you need a specific
 *    "From" address, deploy this under that account, or swap MailApp for
 *    GmailApp.sendEmail(..., { from: 'alias@akadigital.net' }) using a
 *    verified send-as alias on that account.
 * 6. Free Gmail accounts: 100 emails/day quota. Workspace accounts: 1,500/day.
 */

var SHEET_LEADS          = 'Leads';    // tab name for contact form + CTA quiz leads
var SHEET_CAREERS        = 'Careers';  // tab name for job applications
var CC_ADDRESS           = 'Hello@akadigital.net';
var DEFAULT_LEAD_CONTACT = 'jeffrey.teo@akadigital.net';

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);

    if (data.form_type === 'career') {
      logCareer(data);
      emailCareer(data);
    } else {
      logLead(data);
      emailLead(data);
    }

    return ContentService.createTextOutput(JSON.stringify({ ok: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ ok: false, error: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Handles plain browser visits to the /exec URL (GET requests). Without this,
// opening the URL directly — or Google's own health checks — throws
// "Script function not found: doGet". The real website submissions always
// use POST (handled above), so this is just here to avoid a scary-looking error.
function doGet(e) {
  return ContentService.createTextOutput('AKA Digital webhook is live. Submissions are sent via POST.')
    .setMimeType(ContentService.MimeType.TEXT);
}

// Run this manually from the Apps Script editor (select "testDoPost" in the
// function dropdown next to the Run button, then click Run) to verify the
// logging + email logic without needing a real website submission.
// doPost can't be run directly from the editor — it expects a real request
// object 'e' that only exists when Google itself delivers a POST.
function testDoPost() {
  var fakeLead = {
    postData: {
      contents: JSON.stringify({
        form_type: 'lead',
        source_page: '/contact',
        market: 'sg',
        assigned_to: DEFAULT_LEAD_CONTACT,
        name: 'Test Person',
        company: 'Test Co',
        email: 'test@example.com',
        phone: '+65 0000 0000',
        inquiry_type: 'CRM & Marketing Automation',
        message: 'This is a test submission from testDoPost().'
      })
    }
  };
  var result = doPost(fakeLead);
  Logger.log(result.getContent());
}

function getSheet_(name) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(name);
  if (!sheet) sheet = ss.insertSheet(name);
  return sheet;
}

function logLead(data) {
  var sheet = getSheet_(SHEET_LEADS);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow([
      'Timestamp', 'Status', 'Source Page', 'Market', 'Assigned To',
      'Name', 'Brand', 'Company', 'Email', 'Phone', 'Service / Inquiry Type',
      'Solution', 'Pain Point', 'Budget', 'Message'
    ]);
  }
  sheet.appendRow([
    new Date(), 'New Lead',
    data.source_page || '', data.market || '', data.assigned_to || '',
    data.name || '', data.brand || '', data.company || '',
    data.email || '', data.phone || '',
    data.inquiry_type || data.service || '',
    data.solution || '', data.pain_point || '', data.budget || '',
    data.message || ''
  ]);
}

function logCareer(data) {
  var sheet = getSheet_(SHEET_CAREERS);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(['Timestamp', 'Status', 'Role', 'Name', 'Email', 'Phone', 'LinkedIn', 'Cover Note']);
  }
  sheet.appendRow([
    new Date(), 'New Application',
    data.role || '', data.name || '', data.email || '', data.phone || '',
    data.linkedin || '', data.cover || ''
  ]);
}

function emailLead(data) {
  var to = data.assigned_to || DEFAULT_LEAD_CONTACT;
  var interest = data.inquiry_type || data.service || data.solution || 'General';
  var subject = 'New Website Enquiry — ' + interest + ' — ' + (data.name || 'Unknown');
  var body = [
    'A new enquiry was submitted on ' + (data.source_page || 'the website') + '.',
    '',
    'Name: '      + (data.name || '—'),
    'Brand: '     + (data.brand || '—'),
    'Company: '   + (data.company || '—'),
    'Email: '     + (data.email || '—'),
    'Phone: '     + (data.phone || '—'),
    'Market: '    + (data.market || '—'),
    'Interest: '  + interest,
    'Challenge: ' + (data.pain_point || '—'),
    'Budget: '    + (data.budget || '—'),
    'Message: '   + (data.message || '—')
  ].join('\n');

  MailApp.sendEmail({ to: to, cc: CC_ADDRESS, subject: subject, body: body });
}

function emailCareer(data) {
  var subject = 'New Job Application: ' + (data.role || 'Role') + ' — ' + (data.name || 'Unknown');
  var body = [
    'A new job application was submitted.',
    '',
    'Role: '     + (data.role || '—'),
    'Name: '     + (data.name || '—'),
    'Email: '    + (data.email || '—'),
    'Phone: '    + (data.phone || '—'),
    'LinkedIn: ' + (data.linkedin || '—'),
    '',
    'Cover Note:',
    data.cover || '—'
  ].join('\n');

  MailApp.sendEmail({ to: CC_ADDRESS, subject: subject, body: body });
}
