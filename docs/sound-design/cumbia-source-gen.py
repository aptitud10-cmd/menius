# MENIUS — tema "Cumbia" para el Counter (2026-11-14).
# Melodía ORIGINAL (no cita ninguna canción): solo el ritmo y la instrumentación
# son de cumbia costeña, y los ritmos no tienen dueño. Todo sintetizado desde
# cero, sin samples, con el mismo método que firma-source-gen.py.
#
# Instrumentos: acordeón de 3 lengüetas (musette, como el vallenato), guacharaca
# (raspado), tambor alegre (golpes agudos), llamador (contratiempo), bombo y bajo.
# Tonalidad: Do mayor. 2/4 a 100 BPM (semicorchea = 0.15 s).
#
# Uso: FFMPEG=<ruta a ffmpeg> python cumbia-source-gen.py   (escribe los MP3 aquí)
import numpy as np, wave, subprocess, os
SR = 44100
rng = np.random.default_rng(57)
FFMPEG = os.environ.get('FFMPEG', 'ffmpeg')
N = lambda m: 440 * 2 ** ((m - 69) / 12)
S16 = 0.15  # semicorchea a 100 BPM


def T(sec): return np.zeros((2, int(sec * SR)))


def add(b, sig, t, pan=0.0):
    s = int(t * SR); l = np.cos((pan + 1) * np.pi / 4); r = np.sin((pan + 1) * np.pi / 4)
    n = min(len(sig), b.shape[1] - s)
    if n > 0:
        b[0, s:s + n] += sig[:n] * l
        b[1, s:s + n] += sig[:n] * r


# ── Acordeón: 3 lengüetas desafinadas (musette), armónicos con formantes de caja ──
def accordion(f, dur, amp, reeds=(-9, 0, 9)):
    n = int(dur * SR); t = np.arange(n) / SR; out = np.zeros(n)
    bellows = 1 + 0.035 * np.sin(2 * np.pi * 5.2 * t + rng.uniform(0, 6))  # fuelle
    for c in reeds:
        ff = f * 2 ** (c / 1200)
        ph0 = rng.uniform(0, 2 * np.pi)
        for k in range(1, 16):
            fk = ff * k
            if fk > 11000: break
            # lengüeta: casi diente de sierra, impares un poco más fuertes; dos formantes de caja
            a = (1 / k ** 0.85) * (1.0 if k % 2 else 0.7)
            a *= 1 + 1.6 * np.exp(-((fk - 1100) / 450) ** 2) + 0.9 * np.exp(-((fk - 2700) / 700) ** 2)
            out += a * np.sin(2 * np.pi * fk * t + ph0 * k)
    att = np.minimum(t / 0.018, 1)
    rel = int(0.05 * SR); env = att.copy(); env[-rel:] *= np.linspace(1, 0, rel)
    out *= env * bellows
    return amp * out / np.max(np.abs(out))


def acc_note(b, m, t, dur, amp, pan=0.0):
    add(b, accordion(N(m), dur, amp), t, pan)


def acc_chord(b, ms, t, dur, amp, pan=0.0):
    for i, m in enumerate(ms):
        add(b, accordion(N(m), dur, amp / len(ms) * 1.6, reeds=(-6, 0, 6)), t + i * 0.006, pan)


# ── Percusión ──
def noise_band(n, lo, hi):
    x = rng.standard_normal(n); F = np.fft.rfft(x); fr = np.fft.rfftfreq(n, 1 / SR)
    F *= np.exp(-((fr - (lo + hi) / 2) / ((hi - lo) / 2)) ** 2)
    y = np.fft.irfft(F, n); return y / np.max(np.abs(y))


def guacharaca(long=True, amp=0.16):
    """Raspado: 'chuuu' (largo) o 'ki' (corto). Ráfaga de dientes = ruido modulado."""
    dur = 0.13 if long else 0.05
    n = int(dur * SR); t = np.arange(n) / SR
    teeth = 0.55 + 0.45 * np.sign(np.sin(2 * np.pi * (180 if long else 260) * t))
    env = np.minimum(t / 0.004, 1) * np.exp(-t / (0.06 if long else 0.02))
    return amp * noise_band(n, 3000, 8000) * teeth * env


def drum(f0, f1, decay, amp, slap=0.0):
    n = int((decay * 5) * SR); t = np.arange(n) / SR
    f = f1 + (f0 - f1) * np.exp(-t * 30)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / decay)
    if slap:
        body += slap * noise_band(n, 1500, 5000) * np.exp(-t / 0.012)
    return amp * body / np.max(np.abs(body))


ALEGRE = lambda a=.22: drum(420, 300, 0.05, a, slap=.6)    # tambor alegre (agudo, golpe seco)
LLAMADOR = lambda a=.18: drum(260, 190, 0.06, a, slap=.3)  # llamador: marca el contratiempo
BOMBO = lambda a=.30: drum(120, 62, 0.12, a)


def bass(m, dur, amp=.22):
    n = int(dur * SR); t = np.arange(n) / SR; f = N(m)
    s = np.sin(2 * np.pi * f * t) + 0.25 * np.sin(4 * np.pi * f * t)
    env = np.minimum(t / 0.01, 1) * np.exp(-t / (dur * .7)); rel = int(.03 * SR); env[-rel:] *= np.linspace(1, 0, rel)
    return amp * s * env / np.max(np.abs(s))


def groove(b, t0, beats, amp=1.0, alegre=True):
    """Cumbia por tiempo (negra = 4 semicorcheas):
    guacharaca chuuu-ki-ki-ki · llamador en la 3ª semicorchea · bombo en el 1 · alegre repica."""
    for k in range(beats):
        tb = t0 + k * 4 * S16
        add(b, guacharaca(True, .15 * amp), tb, .35)
        for j in (1, 2, 3):
            add(b, guacharaca(False, .10 * amp), tb + j * S16, .35)
        add(b, LLAMADOR(.17 * amp), tb + 2 * S16, -.2)
        if k % 2 == 0: add(b, BOMBO(.30 * amp), tb, 0)
        if alegre and k % 2 == 1:
            add(b, ALEGRE(.20 * amp), tb + 1 * S16, -.45)
            add(b, ALEGRE(.14 * amp), tb + 3 * S16, -.45)


def tumbao(b, t0, roots, amp=.22):
    """Bajo de cumbia: tónica en el 1, quinta en el 2."""
    for k, r in enumerate(roots):
        tb = t0 + k * 4 * S16
        add(b, bass(r, 3.5 * S16, amp), tb, 0)


# ── Mezcla (mismo criterio que Firma) ──
def eq(x, hp=60):
    n = x.shape[1]; fr = np.fft.rfftfreq(n, 1 / SR)
    H = 1 / np.sqrt(1 + (hp / np.maximum(fr, 1)) ** 4) * 1 / np.sqrt(1 + (fr / 12000) ** 4)
    return np.array([np.fft.irfft(np.fft.rfft(c) * H, n) for c in x])


def reverb(x, decay=0.7, wet=.12):
    n = int((decay + .1) * SR); out = np.zeros((2, x.shape[1] + n))
    for c in range(2):
        tt = np.arange(n) / SR; ir = rng.standard_normal(n) * np.exp(-6.91 * tt / decay)
        ir[:int(.012 * SR)] = 0; ir /= np.sqrt(np.sum(ir ** 2))
        L = len(out[c]); w = np.fft.irfft(np.fft.rfft(x[c], L) * np.fft.rfft(ir, L), L)
        out[c] = np.pad(x[c], (0, n)) + wet * w
    return out


def master(x, peak=.89):
    x = eq(x); x /= np.max(np.abs(x))
    nz = np.where(np.max(np.abs(x), axis=0) > 3e-3)[0]; x = x[:, :nz[-1] + 1]
    x = np.tanh(x * 1.4) / np.tanh(1.4) * peak
    f = int(.04 * SR); x[:, -f:] *= np.linspace(1, 0, f); x[:, :int(.002 * SR)] *= np.linspace(0, 1, int(.002 * SR))
    return x


def save(x, name):
    d = (x.T * 32767).astype(np.int16)
    w = wave.open(name + '.wav', 'wb'); w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(d.tobytes()); w.close()
    subprocess.run([FFMPEG, '-loglevel', 'error', '-y', '-i', name + '.wav', '-b:a', '192k', name + '.mp3'], check=True)
    os.remove(name + '.wav')


# ── Motivo (original): "ta-ra TAN, ta-TAN ta, TAAAN" — síncopa en el contratiempo ──
# (midi, inicio en semicorcheas, duración en semicorcheas, intensidad)
MOTIF = [
    (67, 0, 1, .70),   # G4  pickup
    (69, 1, 1, .75),   # A4
    (72, 2, 2, .95),   # C5  (tiempo)
    (76, 4, 1, .85),   # E5
    (74, 5, 2, 1.0),   # D5  síncopa (cae en el contratiempo)
    (72, 7, 1, .80),   # C5
    (76, 8, 2, .90),   # E5
    (79, 10, 4, 1.0),  # G5  nota larga, el fuelle la sostiene
]


def play_motif(b, t0, transpose=0, amp=.42, pan=.1, last_len=None):
    for i, (m, s, d, v) in enumerate(MOTIF):
        dur = (last_len if (last_len and i == len(MOTIF) - 1) else d) * S16 + 0.04
        acc_note(b, m + transpose, t0 + s * S16, dur, amp * v, pan)


def alert():
    b = T(3.0)
    play_motif(b, 0.02)
    acc_chord(b, [60, 64, 67], 0.02 + 2 * S16, 2 * S16, .16, -.3)   # C en el tiempo fuerte
    acc_chord(b, [59, 62, 67], 0.02 + 8 * S16, 2 * S16, .14, -.3)   # G/B
    groove(b, 0.02 + 2 * S16, 3)
    tumbao(b, 0.02 + 2 * S16, [48, 43, 43])
    return master(reverb(b))


def urgent():
    """El motivo dos veces, la segunda un tono arriba y sin resolver (queda en A5): pide atención."""
    b = T(4.0)
    play_motif(b, 0.02, 0, .44, last_len=2)
    play_motif(b, 0.02 + 12 * S16, 2, .48, last_len=4)
    groove(b, 0.02 + 2 * S16, 6, amp=1.25)
    tumbao(b, 0.02 + 2 * S16, [48, 43, 48, 50, 45, 50], .24)
    acc_chord(b, [62, 66, 69], 0.02 + 22 * S16, 4 * S16, .18, -.3)   # D mayor: dominante de la dominante, tensión
    return master(reverb(b, .6, .10))


def accepted(var):
    """Cierre a la tónica (Do) con acorde de acordeón y remate de guacharaca. ~ -6 dB."""
    b = T(3.0)
    if var == 1:   seq = [(76, 0, 1), (74, 1, 1), (72, 2, 6)]                 # E D C — baja y resuelve
    elif var == 2: seq = [(72, 0, 1), (76, 1, 1), (79, 2, 1), (84, 3, 6)]     # C E G C — sube al Do agudo
    else:          seq = [(81, 0, 1), (79, 1, 1), (76, 2, 1), (72, 3, 6)]     # A G E C — vuelta de acordeón
    for i, (m, s, d) in enumerate(seq):
        acc_note(b, m, 0.02 + s * S16, d * S16 + .04, .40 * (1.0 if i == len(seq) - 1 else .8), .1)
    tf = 0.02 + seq[-1][1] * S16
    acc_chord(b, [60, 64, 67, 72], tf, 6 * S16, .22, -.25)
    add(b, BOMBO(.32), tf, 0); add(b, bass(36, 5 * S16, .24), tf, 0)
    for j in range(3):                                                         # remate "chi-ki-chiii"
        add(b, guacharaca(j == 2, .13), tf + j * S16 * .5, .35)
    add(b, ALEGRE(.2), tf + S16, -.45)
    return master(reverb(b, .9, .14)) * 0.5


if __name__ == '__main__':
    # Ganancia final para igualar el volumen percibido de Firma (RMS alerta ≈ -13 dB):
    # el acordeón sostenido es más denso que la celesta y salía ~4 dB más fuerte.
    GAIN = {'alert': .68, 'urgent': .66, 'accepted-1': .72, 'accepted-2': .72, 'accepted-3': .72}
    for name, x in [('alert', alert()), ('urgent', urgent())] + [(f'accepted-{i}', accepted(i)) for i in (1, 2, 3)]:
        save(x * GAIN[name], name)
        print(name, round(x.shape[1] / SR, 2), 's')
