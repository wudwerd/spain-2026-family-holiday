# Tests

Browser tests for the personal section. They drive a real Chromium against a
local copy of the site, so they cover what the page actually does rather than
what the code looks like.

```bash
cd tests
npm install playwright        # once
./run.sh
```

If Chromium is not where playwright expects it:

```bash
CHROME=/path/to/chrome ./run.sh
```

Against the live site instead of a local server:

```bash
BASE=https://wudwerd.github.io/spain-2026-family-holiday ./run.sh
```

## What each one covers

| File | Covers |
|---|---|
| `mrzunit.mjs` | MRZ parsing and repair against camera-style misreads |
| `real.mjs` | A synthetic passport MRZ, plus five manglings of it, and the Schengen verdict |
| `split.mjs` | Passports and Bookings are separate; bare MRZ paste |
| `bk.mjs` | Booking-email parsing, saving, and locking one tab locking the other |
| `camui.mjs` | Camera opens, framing guide, camera released on stop |
| `backup.mjs` | Encrypted backup is ciphertext; restore on a clean device; wrong password; another couple's file refused |
| `before.mjs` | Before-you-fly countdown and the outstanding list |
| `deeplink.mjs` | `#you-docs` and friends open the right tab |
| `pk.mjs` | Packing list survives, no orphaned flight board |

## Notes

Every passport number, MRZ and booking reference in here is invented. The check
digits are computed so the tests are still meaningful, but the documents do not
exist. Nothing real belongs in this directory: the repository is public.

Two things the suite cannot check:

- **OCR accuracy.** The recognition engine downloads at runtime and needs a
  network. The tests cover everything downstream of it: parsing, repair, check
  digits, and the failure paths.
- **Real devices.** Everything runs in headless Chromium.
