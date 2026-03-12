#!/usr/bin/env python3
import qrcode
import sys

url = "exp://192.168.1.140:8081"
qr = qrcode.QRCode(version=1, box_size=10, border=5)
qr.add_data(url)
qr.make(fit=True)

img = qr.make_image(fill_color="black", back_color="white")
img.save("qr-code.png")
print(f"\n✓ QR-код создан: qr-code.png")
print(f"URL: {url}\n")
