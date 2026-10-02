/**
 * Module: DOT Debit Posting + Daily-Limit Verification
 * Description:
 *   Drives the DOT5 (DOT500) "ACCOUNT TRANSACTION" 3270 screen to post a
 *   single debit (DB) transaction and returns the screen result message as
 *   JSON. Used to verify the "Daily Transaction Limit" workshop change:
 *     - BEFORE the change  : any valid debit posts -> "INSERTED SUCCESSFULLY"
 *     - AFTER  the change  : a debit that pushes the account's accumulated
 *                            daily debit total over the ceiling is rejected
 *                            -> "DAILY DEBIT LIMIT EXCEEDED"
 * ------------------------------------------------------------------
 * QUERY-STRING PARAMETERS (all optional except amount is recommended):
 *   amount   - dollar amount, e.g. 9999.00  (default 9999.00)
 *   bank     - 3-digit bank number          (default 001)
 *   type     - 2-char account type          (default DD)
 *   key      - account key                   (default DEMO -> 101123456)
 *   service  - TPS|ATM|POS|EBS|ACH           (default TPS)
 *   code     - non-zero tran code            (default 001)
 *   date     - YYYYMMDD process date         (default = CICS date)
 * ------------------------------------------------------------------
 * Example:
 *   http://host:2020/hbscript/postDebit?amount=9999.00
 */

var common = require('common', 'hbutils');

function pad(value, width) {
    var s = '' + value;
    while (s.length < width) { s = '0' + s; }
    return s;
}

try {
    common.headers.json();

    // ---- Inputs -------------------------------------------------------
    var amount  = HB.request.http.getValue('amount')  || '9999.00';
    var bank    = HB.request.http.getValue('bank')     || '001';
    var acctTyp = HB.request.http.getValue('type')     || 'DD';
    var acctKey = HB.request.http.getValue('key')      || 'DEMO';
    var service = HB.request.http.getValue('service')  || 'TPS';
    var tranCd  = HB.request.http.getValue('code')     || '001';
    var tranDt  = HB.request.http.getValue('date')     || '';

    // Screen AMOUNT 1 field is PIC 9(9)V99 (11 positions, last 2 = cents).
    // Convert dollar input "9999.00" -> "999900".
    var cents = Math.round(parseFloat(amount) * 100);
    var amtField = pad(cents, 11); // full PIC 9(9)V99 display width

    var hb = new HB.Session();
    hb.setFieldTrim(1);

    // ---- Navigate to the DOT5 entry screen ----------------------------
    hb.run('hb_aid=clear');
    hb.set('hb_entry', 'DOT5');
    hb.run('hb_aid=enter');

    // Default the process date to the host date shown on the screen.
    if (!tranDt) {
        var shown = hb.getFieldValue('TRXDATE');   // format YYYY-MM-DD
        if (shown) { tranDt = shown.replace(/-/g, ''); }
    }

    // ---- Fill the transaction fields ----------------------------------
    hb.set('TRXBANK', bank);
    hb.set('TRXTYPE', acctTyp);
    hb.set('TRXKEY',  acctKey);
    hb.set('TRXSERV', service);
    hb.set('TRXFRMT', 'DB');
    hb.set('TRXTDTE', tranDt);
    hb.set('TRXTCDE', tranCd);
    hb.set('TRXAMT1', amtField);

    // ---- F2 = INSERT --------------------------------------------------
    hb.run('hb_aid=pf2');

    // ---- Read the result messages (TRXMSG1 = error, TRXMSG2 = user) ---
    var errMsg  = (hb.getFieldValue('TRXMSG1') || '').trim();
    var userMsg = (hb.getFieldValue('TRXMSG2') || '').trim();
    var combined = (errMsg + ' ' + userMsg).trim();

    var accepted = /INSERTED SUCCESSFULLY/i.test(combined);
    var rejected = /LIMIT EXCEEDED/i.test(combined);

    var status = accepted ? 'ACCEPTED'
               : rejected ? 'REJECTED'
               :            'OTHER';

    writeln(common.toJSONString({
        test: 'DOT_DAILY_LIMIT',
        status: status,
        input: {
            bank: bank,
            accountType: acctTyp,
            accountKey: acctKey,
            service: service,
            tranCode: tranCd,
            processDate: tranDt,
            amount: amount
        },
        screen: {
            errorMessage: errMsg,
            userMessage: userMsg
        }
    }));

} catch (e) {
    HB.response.http.statusCode = 500;
    writeln(common.toJSONString({
        test: 'DOT_DAILY_LIMIT',
        status: 'SYSTEM_FAULT',
        diagnostics: e.message || e.toString()
    }));
}
