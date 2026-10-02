#!/usr/bin/env node
/**
 * New test for the daily-transaction-limit ticket: a debit that pushes the
 * account's accumulated daily debit total over the configured ceiling
 * ($5,000.00) must be REJECTED. Written before the change exists in
 * DOT500 -- run it now and it MUST fail (the current code accepts every
 * valid debit), then again after the change, where it must pass.
 *
 * Usage: node dot.dailyLimit.test.js [amount]
 * Exit 0 = pass, 1 = fail.
 */
const { loadConfig } = require('../hb-cli/lib/config');
const { runScript } = require('../hb-cli/lib/client');

async function main() {
    const amount = process.argv[2] || '50.00';
    const config = loadConfig();
    const result = await runScript(config, { name: 'postDebit', query: `amount=${encodeURIComponent(amount)}` });
    const body = result.json;

    console.log(`$ hb script run postDebit amount=${amount}`);
    console.log(JSON.stringify(body, null, 2));

    const pass = body && body.status === 'REJECTED'
        && /LIMIT EXCEEDED/i.test(body.screen && body.screen.errorMessage || '');

    console.log(pass
        ? 'PASS: debit was rejected for exceeding the daily debit ceiling'
        : `FAIL: expected status REJECTED with "LIMIT EXCEEDED", got status=${body && body.status}`);
    process.exitCode = pass ? 0 : 1;
}

main().catch((err) => {
    console.error('FAIL:', err.message || err);
    process.exitCode = 1;
});
