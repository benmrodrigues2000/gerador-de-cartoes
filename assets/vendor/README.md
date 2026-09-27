# QR encoder

`qrcode.js` is the unmodified ES module distribution of **qrcode-generator 2.0.4**, by Kazuhiko Arase, from <https://github.com/kazuhikoarase/qrcode-generator>. Vendored so QR generation works entirely in the browser without a build step, CDN, or network call. The MIT license is included in `qrcode-LICENSE.txt`.

`../qr.js` is Card Studio's small UTF-8 / SVG adapter. It keeps a four-module quiet zone and lets the print engine scale QR codes as vectors.
