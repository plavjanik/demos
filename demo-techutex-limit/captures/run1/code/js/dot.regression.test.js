#!/usr/bin/env node
/**
 * Regression test: basic account inquiry still works.
 * Deliberately orthogonal to the daily-debit-limit change (DOT500) -- it
 * exercises getCheckingBalances (an inquiry, not a debit insert) so it must
 * stay green whether or not the daily-limit rule exists or has already
 * been tripped for today's accumulated debits.
 *
 * Usage: node dot.regression.test.js
 * Exit 0 = pass, 1 = fail.
 */
const { loadConfig } = require('../hb-cli/lib/config');
const { runScript } = require('../hb-cli/lib/client');

async function main() {
    const config = loadConfig();
    const result = await runScript(config, { name: 'getCheckingBalances', query: 'account=101123456' });
    const body = result.json;

    console.log('$ hb script run getCheckingBalances account=101123456');
    console.log(JSON.stringify(body, null, 2));

    const pass = body && body.status === 'SUCCESS'
        && body.accountInfo && body.accountInfo.customerName === 'WILLIAMS ROBT';

    console.log(pass ? 'PASS: basic account inquiry returns SUCCESS' : 'FAIL: basic account inquiry did not return the expected result');
    process.exitCode = pass ? 0 : 1;
}

main().catch((err) => {
    console.error('FAIL:', err.message || err);
    process.exitCode = 1;
});
