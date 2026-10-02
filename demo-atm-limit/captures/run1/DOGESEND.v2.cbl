      *///////////////////////////////////////////////////////////////
      * DOGE Coin CICS/KICKS Application
      * DOGESEND:
      *   Accepts user input for wallet address and amount to send
      *   Sends a record to the output printer D running on port
      *   3506. Uses dogedcams.py to process printer output and send
      *   funds.
      *
      * AUTHOR:
      *   Philip Young aka Soldier of FORTRAN
      *
      * 08/30/2020
      * License GPL v3
      *///////////////////////////////////////////////////////////////
       IDENTIFICATION DIVISION.
       PROGRAM-ID.   DOGESEND.
       AUTHOR. SOLDIER OF FORTRAN.
       INSTALLATION. DOGE BANK.
       DATE-WRITTEN. 08/30/20.
       SECURITY. CONFIDENTIAL.
       ENVIRONMENT DIVISION.
       DATA DIVISION.
       WORKING-STORAGE SECTION.
       77  SYSOUT-TOKEN        PIC X(8)  VALUE SPACES.
       01  DOGECOMMS-AREA.
           05  START-RECORD-ID PIC 9(10) VALUE 0000000002.
       01  WTO-MESSAGE         PIC X(38) VALUE SPACES.
       01  TO-SEND.
           05  DOGEID          PIC X(10)B VALUE 'DOGECICS99'.
           05  TO-ADDRESS      PIC X(34)B.
           05  SEND-AMOUNT     PIC X(17).
       01  TO-SEND-LEN         PIC 99 VALUE 63.
       01  TOP-MESSAGE.
           05 TEXT-MESSAGE     PIC X(7)B VALUE 'SENDING'.
           05 TEXT-AMOUNT      PIC X(17)B VALUE '00000000.00000000'.
           05 TEXT-CURRENCY    PIC X(4) VALUE 'DOGE'.
      * Daily withdrawal limit. The running total lives in a tracker
      * record in DOGEVSAM under a key that sorts before every real
      * transaction, so the balance read and the history browse skip it.
       01  DAILY-LIMIT         PIC 9(8)V9(8) VALUE 10000.
       01  LIMIT-KEY           PIC X(10) VALUE '0000000000'.
       01  LIMIT-RECORD.
           05  LDATE           PIC X(10) VALUE '0000000000'.
           05  FILLER          PIC X VALUE SPACES.
           05  LADDRSS         PIC X(34) VALUE 'DAILY LIMIT TRACKER'.
           05  FILLER          PIC X VALUE SPACES.
           05  LDAY            PIC X(10).
           05  FILLER          PIC X VALUE SPACES.
           05  LTOTAL.
               10  LTOT-SIGN   PIC X VALUE '+'.
               10  LTOT-INT    PIC 9(8).
               10  LTOT-DOT    PIC X VALUE '.'.
               10  LTOT-DEC    PIC 9(8).
           05  FILLER          PIC X(5) VALUE SPACES.
       01  LIMIT-REC-LEN       PIC S9(4) COMP VALUE +80.
       01  LIMIT-RESP          PIC S9(4) COMP.
           88  LIMIT-REC-FOUND VALUE +0.
           88  LIMIT-REC-NOTFND VALUE +13.
       01  LIMIT-FLAG          PIC X VALUE 'N'.
           88  LIMIT-EXCEEDED  VALUE 'Y'.
       01  ABS-TIME            PIC S9(15) COMP-3.
       01  TODAY               PIC X(10).
      * The typed amount, taken apart by hand: this compiler predates
      * UNSTRING and INSPECT, so the digits are copied with subscripts.
       01  AMT-TEXT.
           05  AMT-CHAR        PIC X OCCURS 17 TIMES.
       01  AMT-INT-X.
           05  AMT-INT-CHAR    PIC X OCCURS 8 TIMES.
       01  AMT-DEC-X.
           05  AMT-DEC-CHAR    PIC X OCCURS 8 TIMES.
       01  AMT-I               PIC S9(4) COMP.
       01  AMT-POINT           PIC S9(4) COMP.
       01  AMT-END             PIC S9(4) COMP.
       01  AMT-DIGITS          PIC S9(4) COMP.
       01  AMT-T               PIC S9(4) COMP.
       01  AMT-PARTS.
           05  AMT-INT-9       PIC 9(8).
           05  AMT-DEC-9       PIC 9(8).
       01  AMT-NUMERIC REDEFINES AMT-PARTS PIC 9(8)V9(8).
       01  WS-TOTAL.
           05  WS-TOTAL-INT    PIC 9(8).
           05  WS-TOTAL-DEC    PIC 9(8).
       01  WS-TOTAL-NUM REDEFINES WS-TOTAL PIC 9(8)V9(8).
       COPY DOGESN.
       COPY DFHAID.
       COPY DFHBMSCA.
       LINKAGE SECTION.
      *
       01  DFHCOMMAREA                       PIC X(10).
      *
       PROCEDURE DIVISION.
       DOGE-MAIN.
      * Main procedure run
           IF EIBCALEN > ZERO THEN
               MOVE DFHCOMMAREA TO DOGECOMMS-AREA.

           IF EIBCALEN EQUAL TO ZERO
              MOVE 'Displaying Send Menu' TO WTO-MESSAGE
              PERFORM DOGE-WTO
              EXEC CICS SEND MAP('DOGESN1')
                  MAPSET('DOGESN') ERASE
              END-EXEC
           ELSE
           IF EIBAID EQUAL TO DFHPF3
               EXEC CICS XCTL
                   PROGRAM('DOGEQUIT')
               END-EXEC
           ELSE
           IF EIBAID EQUAL TO DFHENTER
                   PERFORM RECEIVE-INPUT
                   PERFORM PARSE-INPUT.

           EXEC CICS
               RETURN TRANSID('DSND')
                      COMMAREA(DOGECOMMS-AREA)
           END-EXEC.

       DOGE-WTO.
      * Sends WTO-MESSAGE to MVS Console
           EXEC CICS WRITE OPERATOR
               TEXT(WTO-MESSAGE)
           END-EXEC.
           MOVE SPACES TO WTO-MESSAGE.
       RECEIVE-INPUT.
      * Get the option the user enters

      *     MOVE 'DSND - Getting Input from User.' TO WTO-MESSAGE.
      *     PERFORM DOGE-WTO.
           EXEC CICS
               RECEIVE MAP('DOGESN1')
                       MAPSET('DOGESN')
                       INTO(DOGESN1I)
                       ASIS
           END-EXEC.
       PARSE-INPUT.
      *    Do we want to leave this screen?
           IF OPTIONI EQUAL TO 'T' OR OPTIONI EQUAL TO 't'
      -       OR OPTIONI EQUAL TO 'M' OR OPTIONI EQUAL TO 'm'
               MOVE 'Opening Transaction History' TO WTO-MESSAGE
               PERFORM DOGE-WTO
               EXEC CICS XCTL
                   PROGRAM('DOGETRAN')
               END-EXEC
           ELSE
           IF OPTIONI EQUAL TO 'W' OR OPTIONI EQUAL TO 'w'
               MOVE 'Opening Main Menu' TO WTO-MESSAGE
               PERFORM DOGE-WTO
               MOVE 'W' TO DOGECOMMS-AREA
               EXEC CICS XCTL
                   PROGRAM('DOGECOIN')
                   COMMAREA(DOGECOMMS-AREA)
               END-EXEC
           ELSE
           IF OPTIONI EQUAL TO 'S' OR OPTIONI EQUAL TO 's'
               MOVE 'Opening Such Send' TO WTO-MESSAGE
               PERFORM DOGE-WTO
           ELSE
               PERFORM MOVE-SOME-DOGE.
           MOVE SPACES TO WTO-MESSAGE.
       MOVE-SOME-DOGE.
      *    Ok, now to send some funds
           MOVE PAYTOI TO TO-ADDRESS.
           MOVE AMOUNTI TO SEND-AMOUNT.
           MOVE 'Sending to address' TO WTO-MESSAGE.
           PERFORM DOGE-WTO.
           MOVE TO-ADDRESS TO WTO-MESSAGE.
           PERFORM DOGE-WTO.
      *    Just some simple check incase a person hits enter
           IF TO-ADDRESS EQUAL TO 'Enter address here'
               MOVE DFHREVRS TO PAYTOH
               MOVE 'Invalid DOGE Coin address' TO SNDMSGO
           ELSE
               PERFORM CHECK-DAILY-LIMIT
               IF LIMIT-EXCEEDED
                   MOVE DFHREVRS TO AMOUNTH
                   MOVE 'DAILY LIMIT 10000 DOGE EXCEEDED' TO SNDMSGO
               ELSE
                   PERFORM RECORD-DAILY-TOTAL
                   MOVE SEND-AMOUNT TO TEXT-AMOUNT
                   MOVE TOP-MESSAGE TO SNDMSGO
                   MOVE SPACES TO AMOUNTO

                   EXEC CICS SPOOLOPEN OUTPUT
                       TOKEN(SYSOUT-TOKEN) CLASS('D')
                       USERID('*') NODE('*')
                   END-EXEC

                   EXEC CICS SPOOLWRITE
                       TOKEN(SYSOUT-TOKEN) FROM(TO-SEND)
                       FLENGTH(TO-SEND-LEN)
                   END-EXEC

                   EXEC CICS SPOOLCLOSE
                       TOKEN(SYSOUT-TOKEN)
                   END-EXEC.

           EXEC CICS
               SEND MAP('DOGESN1')
                   MAPSET('DOGESN')
           END-EXEC.

       CHECK-DAILY-LIMIT.
      *    The typed amount is left-justified text such as '999.5':
      *    split it on the point and zero-fill both halves.
           MOVE AMOUNTI TO AMT-TEXT.
           MOVE SPACES TO AMT-INT-X AMT-DEC-X.
           MOVE 18 TO AMT-END AMT-POINT.
           PERFORM SCAN-AMOUNT VARYING AMT-I FROM 1 BY 1
               UNTIL AMT-I > 17.
           IF AMT-POINT > AMT-END MOVE AMT-END TO AMT-POINT.
           SUBTRACT 1 FROM AMT-POINT GIVING AMT-DIGITS.
           IF AMT-DIGITS > 8 MOVE 8 TO AMT-DIGITS.
           PERFORM COPY-INT-DIGIT VARYING AMT-I FROM 1 BY 1
               UNTIL AMT-I > AMT-DIGITS.
           MOVE 0 TO AMT-T.
           ADD 1 AMT-POINT GIVING AMT-I.
           PERFORM COPY-DEC-DIGIT
               UNTIL AMT-I NOT < AMT-END OR AMT-T NOT < 8.
           EXAMINE AMT-INT-X REPLACING ALL ' ' BY '0'.
           EXAMINE AMT-DEC-X REPLACING ALL ' ' BY '0'.
           MOVE AMT-INT-X TO AMT-INT-9.
           MOVE AMT-DEC-X TO AMT-DEC-9.
      *    Today's date, and the tracker record if there is one
           EXEC CICS ASKTIME ABSTIME(ABS-TIME) END-EXEC.
           EXEC CICS FORMATTIME ABSTIME(ABS-TIME)
               DATESEP('-') YYYYMMDD(TODAY)
           END-EXEC.
           EXEC CICS READ FILE('DOGEVSAM') INTO(LIMIT-RECORD)
               RIDFLD(LIMIT-KEY) UPDATE RESP(LIMIT-RESP)
           END-EXEC.
           IF LIMIT-REC-FOUND AND LDAY EQUAL TO TODAY
               MOVE LTOT-INT TO WS-TOTAL-INT
               MOVE LTOT-DEC TO WS-TOTAL-DEC
           ELSE
               MOVE ZEROS TO WS-TOTAL-NUM.
           ADD AMT-NUMERIC TO WS-TOTAL-NUM.
           IF WS-TOTAL-NUM GREATER THAN DAILY-LIMIT
               MOVE 'Y' TO LIMIT-FLAG
           ELSE
               MOVE 'N' TO LIMIT-FLAG.
           IF LIMIT-EXCEEDED AND LIMIT-REC-FOUND
               EXEC CICS UNLOCK FILE('DOGEVSAM') END-EXEC.

       RECORD-DAILY-TOTAL.
      *    Write today's running total back (a new tracker on first use)
           MOVE TODAY TO LDAY.
           MOVE WS-TOTAL-INT TO LTOT-INT.
           MOVE WS-TOTAL-DEC TO LTOT-DEC.
           IF LIMIT-REC-FOUND
               EXEC CICS REWRITE FILE('DOGEVSAM') FROM(LIMIT-RECORD)
                   LENGTH(LIMIT-REC-LEN)
               END-EXEC
           ELSE
               MOVE LIMIT-KEY TO LDATE
               EXEC CICS WRITE FILE('DOGEVSAM') FROM(LIMIT-RECORD)
                   RIDFLD(LIMIT-KEY) LENGTH(LIMIT-REC-LEN)
               END-EXEC.

       SCAN-AMOUNT.
      *    First point = end of the integer part; first blank = end.
           IF AMT-CHAR (AMT-I) = '.' AND AMT-POINT = 18
               MOVE AMT-I TO AMT-POINT.
           IF (AMT-CHAR (AMT-I) = ' ' OR AMT-CHAR (AMT-I) = LOW-VALUE)
               AND AMT-END = 18
               MOVE AMT-I TO AMT-END.

       COPY-INT-DIGIT.
      *    Right-align the integer digits in the 8-byte field.
           COMPUTE AMT-T = 8 - AMT-DIGITS + AMT-I.
           MOVE AMT-CHAR (AMT-I) TO AMT-INT-CHAR (AMT-T).

       COPY-DEC-DIGIT.
           ADD 1 TO AMT-T.
           MOVE AMT-CHAR (AMT-I) TO AMT-DEC-CHAR (AMT-T).
           ADD 1 TO AMT-I.
