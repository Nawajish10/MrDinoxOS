import os

# MP3 header bytes (minimal valid MP3)
mp3_header = bytes([0xFF, 0xFB, 0x90, 0x44]) + bytes(52)

sounds = ['confirmed', 'preparing', 'ready', 'served', 'cancelled', 'order-confirmed', 'notification']
os.makedirs('public/sounds', exist_ok=True)

for sound in sounds:
    with open(f'public/sounds/{sound}.mp3', 'wb') as f:
        f.write(mp3_header)
        
print('Created all sound files')
