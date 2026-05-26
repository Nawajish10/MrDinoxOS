import os

# Minimal MP3 header - MPEG-1 Layer III frame
# This is a valid sync word (0xFF 0xFB) followed by frame header
mp3_frame = bytes([
    0xFF, 0xFB,  # Frame sync word
    0x10, 0x00,  # MPEG-1 Layer III, 128 kbps, 44.1 kHz
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
])

sounds = ['confirmed', 'preparing', 'ready', 'served', 'cancelled', 'order-confirmed', 'notification']
os.makedirs('public/sounds', exist_ok=True)

for sound in sounds:
    with open(f'public/sounds/{sound}.mp3', 'wb') as f:
        f.write(mp3_frame * 10)  # Repeat frame to make it larger

print('Created all sound files')
