# JSA 세트장 방탈출 그림 만들기 (직접 그린 SVG)
# 실행: python3 gen.py  → 이 폴더에 SVG 파일이 만들어져요.
# 영화 스틸컷이나 포스터는 쓰지 않고, 모두 도형으로 새로 그렸어요.
import math, os

HERE = os.path.dirname(os.path.abspath(__file__))
DEFS = '''<defs>
<linearGradient id="brass" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f1cf7c"/><stop offset=".5" stop-color="#d9a54a"/><stop offset="1" stop-color="#b9852f"/></linearGradient>
<linearGradient id="steel" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#97a3b5"/><stop offset="1" stop-color="#4f5b6e"/></linearGradient>
<linearGradient id="wood" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#a8723f"/><stop offset="1" stop-color="#6e4125"/></linearGradient>
<linearGradient id="hutblue" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6fb3e6"/><stop offset="1" stop-color="#3b82c4"/></linearGradient>
<radialGradient id="glow" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#ffd98a" stop-opacity=".9"/><stop offset="1" stop-color="#f4b84c" stop-opacity="0"/></radialGradient>
<linearGradient id="beam" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff3c4" stop-opacity=".55"/><stop offset="1" stop-color="#fff3c4" stop-opacity="0"/></linearGradient>
</defs>'''


def svg(w, h, body):
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w}" height="{h}">{DEFS}{body}</svg>'


def save(name, w, h, body):
    with open(os.path.join(HERE, name + '.svg'), 'w', encoding='utf-8') as f:
        f.write(svg(w, h, body))


# ---------- 스태프 캐릭터 6명 (200 x 300) ----------
def staff(shirt, pants, skin, hair, hairstyle, headgear, item):
    b = '<ellipse cx="100" cy="286" rx="60" ry="10" fill="#000" opacity=".22"/>'
    b += f'<rect x="72" y="200" width="22" height="78" rx="8" fill="{pants}"/><rect x="106" y="200" width="22" height="78" rx="8" fill="{pants}"/>'
    b += '<rect x="64" y="268" width="34" height="16" rx="7" fill="#2a2118"/><rect x="102" y="268" width="34" height="16" rx="7" fill="#2a2118"/>'
    # 몸과 스태프 조끼
    b += f'<rect x="58" y="120" width="84" height="90" rx="24" fill="{shirt}"/>'
    b += '<path d="M66 128 h20 v80 h-20 z M114 128 h20 v80 h-20 z" fill="#2a2f3a" opacity=".85"/>'
    b += '<rect x="70" y="150" width="12" height="14" rx="2" fill="#3a404d"/><rect x="118" y="150" width="12" height="14" rx="2" fill="#3a404d"/>'
    b += '<rect x="112" y="132" width="22" height="14" rx="3" fill="#f4e8cc"/><path d="M116 139 h14" stroke="#9a3b2a" stroke-width="2"/>'  # 출입증
    # 팔
    b += f'<rect x="40" y="128" width="20" height="62" rx="10" fill="{shirt}"/><circle cx="50" cy="192" r="10" fill="{skin}"/>'
    b += f'<rect x="138" y="128" width="20" height="40" rx="10" fill="{shirt}" transform="rotate(-20 148 128)"/><circle cx="152" cy="164" r="10" fill="{skin}"/>'
    # 머리
    if hairstyle == 'long':
        b += f'<path d="M58 70 q-6 60 10 76 h64 q16 -16 10 -76 z" fill="{hair}"/>'
    b += f'<rect x="90" y="104" width="20" height="20" fill="{skin}"/><circle cx="100" cy="74" r="40" fill="{skin}"/>'
    if hairstyle == 'short':
        b += f'<path d="M60 72 q0 -40 40 -40 q40 0 40 40 q-8 -18 -40 -18 q-32 0 -40 18 z" fill="{hair}"/>'
    elif hairstyle == 'bun':
        b += f'<circle cx="100" cy="30" r="14" fill="{hair}"/><path d="M60 70 q2 -34 40 -34 q38 0 40 34 q-20 -12 -40 -10 q-20 -2 -40 10 z" fill="{hair}"/>'
    else:
        b += f'<path d="M60 70 q2 -26 40 -28 q38 2 40 28 q-20 -10 -40 -8 q-20 -2 -40 8 z" fill="{hair}"/>'
    if headgear == 'cap':
        b += '<path d="M60 58 q2 -30 40 -30 q38 0 40 30 z" fill="#c4553c"/><path d="M60 56 h80 l22 8 q-50 8 -102 0 z" fill="#9a3b2a"/>'
    elif headgear == 'headset':
        b += '<path d="M60 74 q0 -46 40 -46 q40 0 40 46" fill="none" stroke="#2a2f3a" stroke-width="7"/><rect x="52" y="66" width="14" height="22" rx="6" fill="#2a2f3a"/><rect x="134" y="66" width="14" height="22" rx="6" fill="#2a2f3a"/><path d="M58 86 q4 18 26 18" fill="none" stroke="#2a2f3a" stroke-width="3"/><circle cx="86" cy="104" r="4" fill="#2a2f3a"/>'
    elif headgear == 'beanie':
        b += '<path d="M60 64 q0 -40 40 -40 q40 0 40 40 z" fill="#3f7a6e"/><rect x="58" y="56" width="84" height="12" rx="6" fill="#2f5e54"/><circle cx="100" cy="24" r="7" fill="#f4e8cc"/>'
    # 얼굴
    b += '<circle cx="86" cy="80" r="4.5" fill="#2a2118"/><circle cx="114" cy="80" r="4.5" fill="#2a2118"/>'
    b += '<path d="M90 94 q10 8 20 0" fill="none" stroke="#2a2118" stroke-width="3" stroke-linecap="round"/>'
    b += '<circle cx="78" cy="92" r="5" fill="#e88b7a" opacity=".45"/><circle cx="122" cy="92" r="5" fill="#e88b7a" opacity=".45"/>'
    b += f'<g transform="translate(152 158)">{item}</g>'
    return b


ITEMS = {
    'clap': '<g transform="rotate(-12)"><rect x="-20" y="-6" width="40" height="28" rx="2" fill="#2a2118"/><rect x="-16" y="0" width="32" height="6" fill="#f4e8cc"/><rect x="-16" y="10" width="20" height="3" fill="#f4e8cc"/><g transform="rotate(-18 -20 -6)"><rect x="-20" y="-16" width="40" height="9" fill="#f4e8cc"/><path d="M-14 -16 l6 9 M-2 -16 l6 9 M10 -16 l6 9" stroke="#2a2118" stroke-width="5"/></g></g>',
    'camera': '<rect x="-20" y="-12" width="32" height="24" rx="4" fill="#2a2118"/><circle cx="18" cy="0" r="9" fill="#4f5b6e" stroke="#1b2740" stroke-width="3"/><circle cx="-12" cy="-20" r="8" fill="#2a2118"/><circle cx="4" cy="-20" r="8" fill="#2a2118"/><circle cx="-12" cy="-20" r="3" fill="#97a3b5"/><circle cx="4" cy="-20" r="3" fill="#97a3b5"/>',
    'script': '<rect x="-14" y="-20" width="30" height="40" rx="2" fill="#fbf5e6" stroke="#b9852f" stroke-width="2" transform="rotate(10)"/><path d="M-8 -10 h18 M-8 -3 h18 M-8 4 h12" stroke="#6b6257" stroke-width="2" transform="rotate(10)"/>',
    'light': '<rect x="-3" y="-4" width="6" height="34" fill="#4f5b6e"/><path d="M-18 -26 h36 l-6 22 h-24 z" fill="#3a404d"/><ellipse cx="0" cy="-4" rx="12" ry="4" fill="#ffd98a"/><circle cx="0" cy="8" r="30" fill="url(#glow)" opacity=".7"/>',
    'mic': '<g transform="rotate(-35)"><rect x="-2" y="-40" width="5" height="54" fill="#4f5b6e"/><rect x="-9" y="-62" width="19" height="26" rx="9" fill="#6d7a8f"/><path d="M-6 -58 v18 M0 -58 v18 M6 -58 v18" stroke="#97a3b5" stroke-width="1.5"/></g>',
    'mega': '<g transform="rotate(-15)"><path d="M-8 -8 l30 -14 v40 l-30 -14 z" fill="#f4b84c" stroke="#c98b1f" stroke-width="2"/><rect x="-16" y="-8" width="10" height="16" rx="3" fill="#2a2118"/><rect x="-10" y="6" width="6" height="14" fill="#2a2118"/></g>',
}
AV = {
    'clap': ('#e8a33d', '#3d5a8c', '#f0c9a8', '#2a1b2e', 'short', 'cap'),
    'camera': ('#c9b6e4', '#3f7a6e', '#e2b48e', '#2a1b2e', 'long', 'none'),
    'script': ('#e3e8ef', '#5a3a24', '#f0c9a8', '#4a2f20', 'bun', 'none'),
    'light': ('#7fb6d6', '#2a2f3a', '#c99067', '#1b1416', 'short', 'beanie'),
    'mic': ('#f2a7a0', '#3d5a8c', '#f0c9a8', '#6b3f22', 'long', 'headset'),
    'mega': ('#9fd18b', '#4f5b6e', '#e2b48e', '#2a1b2e', 'short', 'headset'),
}
for k, v in AV.items():
    save('av_' + k, 200, 300, staff(*v, ITEMS[k]))

# ---------- 경비 로봇 (200 x 200): 탐조등을 단 순찰 로봇 ----------
robot = '<ellipse cx="100" cy="186" rx="56" ry="9" fill="#000" opacity=".22"/>'
robot += '<rect x="44" y="148" width="112" height="26" rx="12" fill="#3a404d"/><circle cx="60" cy="174" r="13" fill="#1b2740"/><circle cx="100" cy="176" r="13" fill="#1b2740"/><circle cx="140" cy="174" r="13" fill="#1b2740"/>'
robot += '<circle cx="60" cy="174" r="5" fill="#97a3b5"/><circle cx="100" cy="176" r="5" fill="#97a3b5"/><circle cx="140" cy="174" r="5" fill="#97a3b5"/>'
robot += '<path d="M52 150 q0 -70 48 -70 q48 0 48 70 z" fill="#6b7a5a" stroke="#4f5b44" stroke-width="3"/>'
robot += '<rect x="66" y="104" width="68" height="26" rx="13" fill="#1b2740"/><circle cx="86" cy="117" r="6" fill="#ff8a6a"/><circle cx="114" cy="117" r="6" fill="#ff8a6a"/>'
robot += '<path d="M60 140 h80" stroke="#f4b84c" stroke-width="5" stroke-dasharray="10 8"/>'
robot += '<rect x="96" y="44" width="8" height="40" fill="#4f5b6e"/>'
robot += '<circle cx="100" cy="30" r="30" fill="#ffd98a" opacity=".35"/><rect x="80" y="18" width="40" height="26" rx="8" fill="#3a404d"/><ellipse cx="100" cy="31" rx="15" ry="10" fill="#fff3c4"/>'
save('robot', 200, 200, robot)


# ---------- 소품 상자 4개 (400 x 400) ----------
def padlock(x, y, s=1.0):
    return (f'<g transform="translate({x} {y}) scale({s})"><path d="M-22 0 v-22 q0 -24 22 -24 q22 0 22 24 v22" fill="none" stroke="#97a3b5" stroke-width="9"/>'
            '<rect x="-34" y="-4" width="68" height="58" rx="10" fill="url(#brass)" stroke="#8a5f1e" stroke-width="3"/>'
            + ''.join(f'<rect x="{-28 + i * 14}" y="14" width="11" height="22" rx="2" fill="#2a2118"/><rect x="{-26 + i * 14}" y="21" width="7" height="8" fill="#f4e8cc"/>' for i in range(4)) +
            '</g>')


shadow = '<ellipse cx="200" cy="372" rx="160" ry="16" fill="#000" opacity=".22"/>'
# 1. 남측 초소 사물함 (철제)
b = shadow + '<rect x="90" y="40" width="220" height="320" rx="10" fill="url(#steel)" stroke="#33476f" stroke-width="5"/>'
b += '<rect x="108" y="60" width="184" height="134" rx="6" fill="#6d7a8f"/><rect x="108" y="208" width="184" height="134" rx="6" fill="#6d7a8f"/>'
b += ''.join(f'<rect x="128" y="{74 + i * 12}" width="60" height="5" rx="2" fill="#4f5b6e"/>' for i in range(4))
b += '<rect x="226" y="72" width="50" height="22" rx="3" fill="#f4e8cc"/><path d="M234 83 h34" stroke="#3e7fc1" stroke-width="4"/>'
b += padlock(200, 252, 1.2)
save('box_locker', 400, 400, b)
# 2. 회담장 서류함 (파란 서류 캐비닛)
b = shadow + '<rect x="80" y="60" width="240" height="300" rx="10" fill="#2b4a63" stroke="#1b2740" stroke-width="5"/>'
for i in range(3):
    y = 80 + i * 92
    b += f'<rect x="98" y="{y}" width="204" height="78" rx="6" fill="#3b6a8c"/><rect x="170" y="{y + 12}" width="60" height="12" rx="6" fill="#97a3b5"/>'
b += '<rect x="112" y="30" width="120" height="40" rx="4" fill="#fbf5e6" transform="rotate(-6 172 50)"/><path d="M124 46 h90 M124 56 h60" stroke="#6b6257" stroke-width="4" transform="rotate(-6 172 50)"/>'
b += '<circle cx="268" cy="44" r="16" fill="#4f9a6a"/><path d="M260 44 l6 6 l10 -12" fill="none" stroke="#fff" stroke-width="4"/>'
b += padlock(200, 262, 1.2)
save('box_file', 400, 400, b)
# 3. 북측 초소 나무 상자
b = shadow + '<rect x="60" y="130" width="280" height="220" rx="10" fill="url(#wood)" stroke="#4a2a16" stroke-width="5"/>'
b += '<path d="M60 90 h280 l-10 50 h-260 z" fill="#8c5a34" stroke="#4a2a16" stroke-width="5"/>'
b += ''.join(f'<path d="M64 {170 + i * 44} h272" stroke="#5a3a24" stroke-width="3"/>' for i in range(4))
b += '<rect x="76" y="130" width="22" height="220" fill="#5a3a24"/><rect x="302" y="130" width="22" height="220" fill="#5a3a24"/>'
b += '<path d="M150 60 q50 -40 100 0" fill="none" stroke="#4f5b6e" stroke-width="10" stroke-linecap="round"/>'
b += '<circle cx="290" cy="112" r="10" fill="#e08a3c"/>'
b += padlock(200, 222, 1.2)
save('box_wood', 400, 400, b)
# 4. 소품 창고 필름 통 상자
b = shadow + '<rect x="70" y="140" width="260" height="210" rx="14" fill="#5a4a7a" stroke="#3a2f52" stroke-width="5"/>'
b += '<rect x="70" y="140" width="260" height="40" rx="10" fill="#6d5b94"/>'
for cx in (140, 260):
    b += f'<circle cx="{cx}" cy="90" r="62" fill="#97a3b5" stroke="#4f5b6e" stroke-width="5"/>'
    b += ''.join(f'<circle cx="{cx + 34 * math.cos(k * 1.2566):.1f}" cy="{90 + 34 * math.sin(k * 1.2566):.1f}" r="13" fill="#4f5b6e"/>' for k in range(5))
    b += f'<circle cx="{cx}" cy="90" r="9" fill="#ffd98a"/>'
b += '<path d="M140 150 q60 30 120 0" fill="none" stroke="#2a2118" stroke-width="12"/>'
b += padlock(200, 238, 1.2)
save('box_film', 400, 400, b)

# ---------- 단서 소품 4개 (240 x 240) ----------
sh = '<ellipse cx="120" cy="222" rx="80" ry="10" fill="#000" opacity=".22"/>'
p = sh + '<rect x="40" y="40" width="160" height="150" rx="6" fill="#8c5a34" stroke="#5a3a24" stroke-width="5"/><rect x="52" y="52" width="136" height="126" fill="#c9a56a"/>'
p += '<rect x="62" y="62" width="64" height="50" fill="#fbf5e6" transform="rotate(-4 94 87)"/><rect x="132" y="68" width="48" height="60" fill="#e9f0f7"/><rect x="70" y="122" width="100" height="44" fill="#fff6dc"/>'
p += '<circle cx="94" cy="62" r="5" fill="#c4553c"/><circle cx="156" cy="68" r="5" fill="#3e7fc1"/><circle cx="120" cy="122" r="5" fill="#4f9a6a"/>'
p += '<path d="M80 136 h80 M80 148 h56" stroke="#6b6257" stroke-width="4"/><rect x="108" y="190" width="24" height="26" fill="#5a3a24"/>'
save('prop_board', 240, 240, p)
p = sh + '<path d="M50 150 q-6 -50 40 -64 q50 -14 90 14 q26 26 6 58 q-30 28 -86 20 q-40 -6 -50 -28 z" fill="#8d8a80" stroke="#5f5c54" stroke-width="5"/>'
p += '<path d="M70 120 q40 -20 100 4" fill="none" stroke="#6f6c64" stroke-width="4"/>'
p += '<rect x="78" y="96" width="92" height="64" rx="4" fill="#fbf5e6" stroke="#b9852f" stroke-width="3" transform="rotate(-8 124 128)"/>'
p += '<path d="M64 128 q60 18 116 -6" fill="none" stroke="#c4553c" stroke-width="6"/><path d="M90 120 h56 M92 140 h40" stroke="#6b6257" stroke-width="4" transform="rotate(-8 124 128)"/>'
save('prop_stone', 240, 240, p)
p = sh + '<rect x="36" y="44" width="168" height="140" rx="6" fill="url(#brass)" stroke="#8a5f1e" stroke-width="4"/><rect x="50" y="58" width="140" height="112" fill="#d6dfe8"/>'
p += '<rect x="50" y="128" width="140" height="42" fill="#a8b4a0"/><rect x="118" y="80" width="40" height="48" fill="#6fb3e6"/>'
for i, x in enumerate((70, 98, 140, 170)):
    c = ['#3d5a8c', '#3d5a8c', '#6b7a5a', '#6b7a5a'][i]
    p += f'<circle cx="{x}" cy="112" r="9" fill="#e2b48e"/><rect x="{x - 9}" y="121" width="18" height="30" rx="7" fill="{c}"/>'
save('prop_photo', 240, 240, p)
p = sh + '<rect x="112" y="120" width="16" height="96" fill="#4f5b6e"/>'
p += '<path d="M60 60 l90 -30 v120 l-90 -30 z" fill="#97a3b5" stroke="#4f5b6e" stroke-width="5"/><rect x="34" y="58" width="32" height="64" rx="8" fill="#4f5b6e"/>'
p += '<path d="M168 60 q16 30 0 60 M184 46 q28 44 0 88" fill="none" stroke="#ffd98a" stroke-width="6" stroke-linecap="round"/>'
p += '<circle cx="120" cy="190" r="10" fill="#c4553c"/>'
save('prop_speaker', 240, 240, p)

# ---------- 필름 보관실 문 (600 x 800) ----------
v = '<rect width="600" height="800" fill="#1b2740"/><rect x="40" y="40" width="520" height="740" rx="14" fill="#33476f"/>'
v += '<rect x="70" y="70" width="460" height="690" rx="10" fill="url(#steel)" stroke="#26324d" stroke-width="8"/>'
v += ''.join(f'<circle cx="{x}" cy="{y}" r="7" fill="#6d7a8f"/>' for x in (96, 504) for y in range(100, 740, 60))
v += '<rect x="150" y="96" width="300" height="60" rx="8" fill="#26324d"/>'
v += ''.join(f'<rect x="{166 + i * 36}" y="110" width="22" height="32" rx="3" fill="#4f5b6e"/>' for i in range(8))
v += '<circle cx="300" cy="330" r="120" fill="#4f5b6e" stroke="#26324d" stroke-width="10"/><circle cx="300" cy="330" r="92" fill="url(#brass)" stroke="#8a5f1e" stroke-width="6"/>'
v += ''.join(f'<rect x="296" y="{330 - 86}" width="8" height="20" fill="#5a3a10" transform="rotate({k * 36} 300 330)"/>' for k in range(10))
v += '<circle cx="300" cy="330" r="34" fill="#b9852f" stroke="#8a5f1e" stroke-width="5"/><path d="M300 300 v60 M270 330 h60" stroke="#8a5f1e" stroke-width="10" stroke-linecap="round"/>'
for i, col in enumerate(['#3e7fc1', '#4f9a6a', '#e08a3c', '#8b6bbf']):
    x = 150 + i * 100
    v += f'<circle cx="{x}" cy="560" r="34" fill="#26324d" stroke="{col}" stroke-width="10"/><circle cx="{x}" cy="552" r="9" fill="#0d1528"/><rect x="{x - 5}" y="552" width="10" height="24" fill="#0d1528"/>'
v += '<rect x="200" y="650" width="200" height="60" rx="8" fill="#f4e8cc"/>'
v += '<circle cx="250" cy="680" r="20" fill="none" stroke="#2a2118" stroke-width="6"/><circle cx="350" cy="680" r="20" fill="none" stroke="#2a2118" stroke-width="6"/><path d="M270 680 h60" stroke="#2a2118" stroke-width="6"/>'
save('vault', 600, 800, v)


# ---------- 배경 그림 공통 ----------
def stars(n, seed, h):
    out = ''
    s = seed
    for _ in range(n):
        s = (s * 9301 + 49297) % 233280
        x = s % 1600
        s = (s * 9301 + 49297) % 233280
        y = s % h
        r = 1 + (s % 3) * .6
        out += f'<circle cx="{x}" cy="{y}" r="{r:.1f}" fill="#fff" opacity="{.4 + (s % 5) / 10:.1f}"/>'
    return out


def hut(x, y, w=150, h=110, color='url(#hutblue)'):
    o = f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="{color}" stroke="#24345a" stroke-width="3"/>'
    o += f'<path d="M{x - 8} {y} l{w / 2 + 8} -26 l{w / 2 + 8} 26 z" fill="#5aa0d8" stroke="#24345a" stroke-width="3"/>'
    o += ''.join(f'<rect x="{x + 16 + i * 46}" y="{y + 26}" width="28" height="30" fill="#ffe6a8" stroke="#24345a" stroke-width="2"/>' for i in range(3))
    o += f'<rect x="{x + w / 2 - 14}" y="{y + h - 46}" width="28" height="46" fill="#24345a"/>'
    return o


def beam(x, y, ang, length=900, spread=8):
    a1, a2 = math.radians(ang - spread), math.radians(ang + spread)
    return (f'<path d="M{x} {y} L{x + length * math.cos(a1):.0f} {y + length * math.sin(a1):.0f} L{x + length * math.cos(a2):.0f} {y + length * math.sin(a2):.0f} Z" fill="#fff3c4" opacity=".16"/>'
            f'<circle cx="{x}" cy="{y}" r="9" fill="#fff3c4"/>')


# ---------- 시작 화면 배경 (1600 x 900): 밤의 영화 세트장 ----------
e = '<rect width="1600" height="900" fill="#141d33"/>'
e += '<rect width="1600" height="560" fill="#1b2740"/>' + stars(90, 7, 420)
e += '<circle cx="1320" cy="140" r="46" fill="#fbf5e6" opacity=".9"/><circle cx="1302" cy="128" r="46" fill="#1b2740"/>'
e += '<path d="M0 470 q200 -60 400 -20 q220 50 420 -10 q220 -60 420 0 q200 50 360 0 v90 h-1600 z" fill="#22304d"/>'
e += beam(260, 300, -38) + beam(1340, 300, -142)
e += '<rect x="250" y="300" width="20" height="260" fill="#33476f"/><rect x="1330" y="300" width="20" height="260" fill="#33476f"/>'
# 회색 건물 둘 (남측, 북측)
e += '<rect x="80" y="330" width="360" height="230" fill="#4a5568"/><rect x="1160" y="320" width="360" height="240" fill="#57534a"/>'
e += ''.join(f'<rect x="{100 + i * 56}" y="370" width="36" height="44" fill="#ffe6a8" opacity=".7"/>' for i in range(6))
e += ''.join(f'<rect x="{1180 + i * 56}" y="360" width="36" height="44" fill="#ffe6a8" opacity=".55"/>' for i in range(6))
# 땅과 파란 건물 셋, 가운데 선
e += '<rect y="560" width="1600" height="340" fill="#3a3f4a"/><rect y="560" width="1600" height="10" fill="#2a2f3a"/>'
e += hut(470, 470) + hut(725, 470) + hut(980, 470)
e += '<rect x="420" y="640" width="760" height="16" fill="#e9e6dc"/><rect x="420" y="652" width="760" height="5" fill="#b9b5a8"/>'
# 세트장 표시: 조명대, 카메라, 감독 의자
e += '<g transform="translate(140 600)"><path d="M0 220 l40 -160 l40 160" fill="none" stroke="#1b2740" stroke-width="8"/><rect x="34" y="-10" width="12" height="80" fill="#1b2740"/><path d="M8 -40 h64 l-10 36 h-44 z" fill="#2a2f3a"/><ellipse cx="40" cy="-6" rx="24" ry="6" fill="#ffd98a"/></g>'
e += '<g transform="translate(1380 640)"><path d="M0 200 l50 -130 l50 130 M50 70 v130" fill="none" stroke="#1b2740" stroke-width="8"/><rect x="10" y="20" width="90" height="56" rx="8" fill="#1b2740"/><circle cx="110" cy="48" r="20" fill="#2a2f3a" stroke="#4f5b6e" stroke-width="5"/><circle cx="30" cy="4" r="22" fill="#1b2740"/><circle cx="76" cy="4" r="22" fill="#1b2740"/></g>'
e += '<g transform="translate(1200 740)"><path d="M0 0 h90 M10 0 l60 100 M80 0 l-60 100" stroke="#5a3a24" stroke-width="8"/><rect x="0" y="-60" width="90" height="40" fill="#9a3b2a"/><rect x="-4" y="-4" width="98" height="14" fill="#9a3b2a"/></g>'
e += '<rect width="1600" height="900" fill="url(#glow)" opacity=".08"/>'
save('entry_bg', 1600, 900, e)

# ---------- 끝 장면 (1600 x 900): 새벽, 다시 이어진 다리 ----------
d = '<defs><linearGradient id="dawn" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3d5a8c"/><stop offset=".55" stop-color="#f2a37a"/><stop offset="1" stop-color="#ffe0a3"/></linearGradient></defs>'
d += '<rect width="1600" height="900" fill="url(#dawn)"/>'
d += '<circle cx="800" cy="520" r="120" fill="#fff3c4" opacity=".95"/><circle cx="800" cy="520" r="220" fill="#fff3c4" opacity=".25"/>'
d += '<path d="M0 520 q240 -90 480 -30 q200 50 320 40 q160 -10 340 -70 q240 -60 460 40 v120 h-1600 z" fill="#7a6a8e" opacity=".7"/>'
d += '<path d="M0 580 q300 -60 600 0 q200 40 400 0 q300 -60 600 10 v310 h-1600 z" fill="#4f7d5c"/>'
d += '<path d="M0 690 q400 -40 800 0 q400 40 800 0 v210 h-1600 z" fill="#5f8fb8"/>'
d += ''.join(f'<path d="M{80 + i * 140} {730 + (i % 3) * 30} q30 -8 60 0" stroke="#d6e6f3" stroke-width="4" fill="none" opacity=".7"/>' for i in range(11))
# 다리
d += '<rect x="300" y="610" width="1000" height="26" fill="#6d5b48"/><rect x="300" y="602" width="1000" height="10" fill="#8c7a62"/>'
d += ''.join(f'<rect x="{320 + i * 120}" y="636" width="22" height="90" fill="#5a4a3a"/>' for i in range(9))
d += ''.join(f'<rect x="{300 + i * 40}" y="582" width="5" height="22" fill="#5a4a3a"/>' for i in range(26)) + '<rect x="300" y="580" width="1000" height="5" fill="#5a4a3a"/>'
# 다리 위의 작은 사람들 (서로 다른 옷)
cols = ['#3d5a8c', '#c4553c', '#6b7a5a', '#e8a33d', '#8b6bbf', '#3f7a6e']
for i, x in enumerate((560, 620, 700, 900, 980, 1040)):
    d += f'<circle cx="{x}" cy="548" r="11" fill="#2a2118"/><rect x="{x - 10}" y="558" width="20" height="30" rx="8" fill="{cols[i]}"/><rect x="{x - 8}" y="586" width="6" height="16" fill="#2a2118"/><rect x="{x + 2}" y="586" width="6" height="16" fill="#2a2118"/>'
d += '<path d="M630 566 q35 -14 60 0 M910 566 q35 -14 60 0" stroke="#2a2118" stroke-width="5" fill="none"/>'
# 새
for i, (x, y, s) in enumerate([(520, 300, 1.2), (600, 260, 1), (700, 320, .9), (980, 240, 1.3), (1060, 300, 1), (1160, 270, .8)]):
    d += f'<path d="M{x} {y} q{12 * s} {-12 * s} {24 * s} 0 q{12 * s} {-12 * s} {24 * s} 0" stroke="#2a2f3a" stroke-width="4" fill="none"/>'
# 필름 띠 테두리
d += '<rect width="1600" height="56" fill="#1b1416"/><rect y="844" width="1600" height="56" fill="#1b1416"/>'
d += ''.join(f'<rect x="{20 + i * 64}" y="16" width="34" height="24" rx="4" fill="#fbf5e6" opacity=".85"/><rect x="{20 + i * 64}" y="860" width="34" height="24" rx="4" fill="#fbf5e6" opacity=".85"/>' for i in range(25))
save('ending', 1600, 900, d)
print('done')
