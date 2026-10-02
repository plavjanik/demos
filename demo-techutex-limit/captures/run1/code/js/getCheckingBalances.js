/**
 * ============================================================================
 * SCRIPT: getCheckingBalances.js
 * PURPOSE: Demonstrates how to turn a legacy 3270 screen into a RESTful API.
 * This script navigates the AIS2 application, inputs an account 
 * number, and extracts the resulting screen data into a JSON object.
 * * USAGE:   Deploy via VS Code (HB.js: Put), then call via browser/Postman:
 * http://<host>:<port>/hbscript/getCheckingBalancesScrape?account=101123456
 * ============================================================================
 */

try {
    // ------------------------------------------------------------------------
    // STEP 1: INITIALIZATION
    // ------------------------------------------------------------------------
    
    // Create a new HostBridge session. Think of this as opening a virtual 
    // 3270 terminal emulator in the background.
    var hb = new HB.Session(); 
    
    // Import the HostBridge utility library. This gives us easy tools to 
    // handle common tasks, like formatting JSON for older mainframe engines.
    var common = require('common', 'hbutils'); 
    
    // Tell the browser or calling application to expect JSON data back, 
    // not plain text or HTML.
    common.headers.json(); 


    // ------------------------------------------------------------------------
    // STEP 2: CAPTURE INPUT
    // ------------------------------------------------------------------------
    
    // Grab the 'account' value passed in the URL. 
    // Example: ?account=101123456 makes inputAcct = "101123456"
    var inputAcct = HB.request.http.getValue('account');
    
    // Mainframe screens often pad fields with spaces. Setting this to 1 
    // automatically trims trailing whitespace from everything we scrape.
    hb.setFieldTrim(1); 


    // ------------------------------------------------------------------------
    // STEP 3: NAVIGATE THE MAINFRAME (THE "VIRTUAL TYPING")
    // ------------------------------------------------------------------------
    
    // Emulate pressing the "CLEAR" key on a mainframe keyboard to ensure 
    // we are starting from a blank slate.
    hb.run('hb_aid=clear'); 
    
    // Type the CICS transaction code 'AIS2' into the terminal.
    hb.set('hb_entry', 'AIS2'); 
    
    // Emulate pressing the "ENTER" key to execute the transaction.
    hb.run('hb_aid=enter'); 

    // Now that the AIS2 menu is loaded, we fill out the specific fields.
    // Notice we use the actual CICS BMS Map field names (e.g., 'ADMTRAN').
    hb.set('ADMTRAN', '65');      // Service code for Balance Inquiry
    hb.set('ADMTYPE', 'DD');      // Account type for Checking
    hb.set('ADMACT1', inputAcct); // The account number we got from the URL
    
    // Emulate pressing the "PF2" (F2) key to submit our search criteria.
    hb.run('hb_aid=pf2'); 


    // ------------------------------------------------------------------------
    // STEP 4: EXTRACT DATA ("FIELD-AWARE" SCRAPING)
    // ------------------------------------------------------------------------
    
    // At this point, the virtual terminal is looking at the results screen.
    // We create a standard JavaScript object and populate it by asking HostBridge 
    // for the exact values sitting in specific screen fields. 
    // Because we use field names (like 'BALCURR') instead of row/column coordinates,
    // this API will not break even if the green screen layout changes later!
    var result = {
        status: "SUCCESS",
        header: {
            bank: hb.getFieldValue('BALBANK'),
            screenDate: hb.getFieldValue('BALDATE')
        },
        accountInfo: {
            type: hb.getFieldValue('BALTYPE'),
            accountNumber: hb.getFieldValue('BALACCT'),
            customerName: hb.getFieldValue('BALSNAM'),
            fileDate: hb.getFieldValue('BALFDTE')
        },
        primaryBalances: {
            currentBalance: hb.getFieldValue('BALCURR'),
            accountBalance: hb.getFieldValue('BALBAL1'),
            collectedFunds: hb.getFieldValue('BALCFND'),
            availableBalance: hb.getFieldValue('BALAVAL')
        },
        floatDetail: {
            day1: hb.getFieldValue('BALFLT1'),
            day2: hb.getFieldValue('BALFLT2'),
            day3: hb.getFieldValue('BALFLT3'),
            day4: hb.getFieldValue('BALFLT4'),
            day5: hb.getFieldValue('BALFLT5'),
            other: hb.getFieldValue('BALOFLT')
        },
        overdraftAndCredit: {
            odLimit: hb.getFieldValue('BALOLMT'),
            creditLine: hb.getFieldValue('BALCRLN'),
            linePayoff: hb.getFieldValue('BALPOFF'),
            otherFunds: hb.getFieldValue('BALFUND'),
            memoCredit: hb.getFieldValue('BALMPCR'),
            memoDebits: hb.getFieldValue('BALMPDB'),
            linePastDue: hb.getFieldValue('BALPDUE')
        },
        activityDetail: {
            depositCredits: hb.getFieldValue('BALODEP'),
            withdrawals: hb.getFieldValue('BALOWDL'),
            otherHolds: hb.getFieldValue('BALOHLD')
        },
        odpProtection: {
            idType: hb.getFieldValue('BALODPT'),
            idAccount: hb.getFieldValue('BALODPA'),
            transferLimit: hb.getFieldValue('BALTSFL'),
            transferOnline: hb.getFieldValue('BALTSFA')
        }
    };


    // ------------------------------------------------------------------------
    // STEP 5: RETURN THE RESULT
    // ------------------------------------------------------------------------
    
    // Convert our JavaScript object into a perfectly formatted JSON string, 
    // and write it back to the client (Browser/Postman) that called the API.
    writeln(common.toJSONString(result)); 

} catch (e) {
    // ------------------------------------------------------------------------
    // ERROR HANDLING
    // ------------------------------------------------------------------------
    // If anything goes wrong (e.g., CICS is down, field doesn't exist), 
    // catch the error and return it cleanly as JSON instead of crashing.
    writeln(common.toJSONString({ status: "ERROR", details: e.toString() }));
}
