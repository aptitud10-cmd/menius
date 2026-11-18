import numpy as np, wave, subprocess
SR=44100; rng=np.random.default_rng(11)
N=lambda m:440*2**((m-69)/12)
def T(sec): return np.zeros((2,int(sec*SR)))
def add(b,sig,t,pan=0.0,haas=0.0):
    s=int(t*SR); l=np.cos((pan+1)*np.pi/4); r=np.sin((pan+1)*np.pi/4)
    for c,g,off in [(0,l,0),(1,r,int(haas*SR))]:
        st=s+off; n=min(len(sig),b.shape[1]-st)
        if n>0: b[c,st:st+n]+=sig[:n]*g
def modal(f,partials,dur,amp,click=0.06,cents=0.0,beat=0.0):
    n=int(dur*SR); t=np.arange(n)/SR; out=np.zeros(n)
    f=f*2**(cents/1200)
    for r,a,t60 in partials:
        for d in ([1-beat,1+beat] if beat else [1]):
            ph=rng.uniform(0,2*np.pi)
            out+=a/(2 if beat else 1)*np.exp(-6.91*t/t60)*np.sin(2*np.pi*f*r*d*t+ph)
    att=np.minimum(t/0.002,1); out*=att
    m=int(.003*SR); nz=rng.standard_normal(m)*np.hanning(m)
    F=np.fft.rfft(nz,n); fr=np.fft.rfftfreq(n,1/SR); F*=np.exp(-((fr-4500)/1800)**2)
    out+=click*np.fft.irfft(F,n)/max(1e-9,np.max(np.abs(np.fft.irfft(F,n))))
    fade=int(.05*SR); out[-fade:]*=np.linspace(1,0,fade)
    return amp*out/np.max(np.abs(out))
def epiano(f,dur,amp,cents=0):
    n=int(dur*SR); t=np.arange(n)/SR; f=f*2**(cents/1200)
    I=1.5*np.exp(-t/0.6); tine=2*np.exp(-t/0.03)
    s=np.sin(2*np.pi*f*t+I*np.sin(2*np.pi*f*t)+0.3*tine*np.sin(2*np.pi*14*f*t))
    s*=np.exp(-6.91*t/2.2)*np.minimum(t/0.003,1); fade=int(.05*SR); s[-fade:]*=np.linspace(1,0,fade)
    return amp*s
def voice(b,gen,t,pan,width=.35):
    add(b,gen(-5),t,pan-width,0); add(b,gen(5),t,pan+width,0.011)
def eq(x,hp=200,dip=3000,dipdb=-3,shelf=10000,shelfdb=2.5):
    n=x.shape[1]; fr=np.fft.rfftfreq(n,1/SR)
    H=1/np.sqrt(1+(hp/np.maximum(fr,1))**4)
    H*=10**((dipdb*np.exp(-((fr-dip)/700)**2))/20)
    H*=10**((shelfdb/(1+np.exp(-(fr-shelf)/1500)))/20)
    return np.array([np.fft.irfft(np.fft.rfft(c)*H,n) for c in x])
def reverb(x,decay=1.4,wet=.18,pre=.02):
    n=int((decay+pre+.05)*SR); out=np.zeros((2,x.shape[1]+n))
    for c in range(2):
        ir=np.zeros(n); tt=np.arange(n)/SR
        for d in rng.uniform(.007,.04,5): ir[int((pre+d)*SR)]+=rng.uniform(.3,.6)*rng.choice([-1,1])
        tail=rng.standard_normal(n)*np.exp(-6.91*tt/decay); tail[:int((pre+.03)*SR)]=0
        F=np.fft.rfft(tail); fr=np.fft.rfftfreq(n,1/SR); F*=1/np.sqrt(1+(fr/7000)**4)/np.sqrt(1+(200/np.maximum(fr,1))**4)
        ir+=np.fft.irfft(F,n)*.5; ir/=np.sqrt(np.sum(ir**2))
        L=len(out[c]); wetc=np.fft.irfft(np.fft.rfft(x[c],L)*np.fft.rfft(ir,L),L)
        out[c]=np.pad(x[c],(0,n))+wet*wetc
    return out
def master(x,peak=.9):
    x=eq(x); x/=np.max(np.abs(x)); nzi=np.where(np.max(np.abs(x),axis=0)>3e-3)[0]; x=x[:,:nzi[-1]+1]
    x=np.tanh(x/np.max(np.abs(x))*1.3)/np.tanh(1.3)*peak
    f=int(.05*SR); x[:,-f:]*=np.linspace(1,0,f); x[:,:int(.002*SR)]*=np.linspace(0,1,int(.002*SR))
    return x
def save(x,name):
    d=(x.T*32767).astype(np.int16); w=wave.open(name+'.wav','wb'); w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(d.tobytes()); w.close()
    subprocess.run(['ffmpeg','-loglevel','error','-y','-i',name+'.wav','-b:a','192k',name+'.mp3'])

BOWL=[(1,1,2.2),(2.778,.45,1.2),(5.181,.18,.6),(8.163,.07,.3)]
GLASS=[(1,1,1.6),(2.32,.35,.7),(4.25,.15,.35),(6.63,.05,.2)]
VIBE=[(1,1,2.5),(3.984,.3,.6),(10.668,.08,.15)]
BELL=[(.5,.35,2.5),(1,.5,1.8),(1.183,.55,1.4),(1.506,.25,1.0),(2.0,1,1.2),(2.662,.15,.5),(3.011,.12,.4),(4.166,.08,.25)]
CHIME=[(1,1,1.6),(1.494,.45,1.0),(2.086,.3,.6),(.605,.12,.8)]
def tremolo(s,f=5.5,d=.35):
    t=np.arange(len(s))/SR; return s*(1-d*(0.5+0.5*np.sin(2*np.pi*f*t)))

CELESTA=[(1,1,1.3),(2.76,.1,.3),(4.0,.15,.45)]
GLOCK=[(1,1,1.8),(2.756,.12,.15),(5.423,.05,.08)]
HANDPAN=[(1,1,2.6),(2.0,.5,1.8),(3.0,.25,1.0)]
def harp(f,dur,amp,cents=0,rho=.998):
    f=f*2**(cents/1200); n=int(dur*SR); P=int(round(SR/f)); y=np.zeros(n+P+2)
    exc=rng.uniform(-1,1,P); exc=np.convolve(exc,np.ones(3)/3,'same'); y[1:P+1]=exc
    i=P+1
    while i<n+P+1:
        j=min(i+P,n+P+1); y[i:j]=rho*0.5*(y[i-P:j-P]+y[i-P-1:j-P-1]); i=j
    s=y[P+1:P+1+n]; t=np.arange(n)/SR; s*=np.exp(-t/ (dur*.6))
    fade=int(.04*SR); s[-fade:]*=np.linspace(1,0,fade)
    return amp*s/np.max(np.abs(s))
def thump(amp=.18):
    n=int(.12*SR); t=np.arange(n)/SR
    return amp*np.sin(2*np.pi*(220*np.exp(-t*18)+110)*t)*np.exp(-t/.03)
def sparkle(b,t0,notes,n=9,amp=.07,span=.5):
    for k in range(n):
        m=notes[k%len(notes)]+12*(k//len(notes)); tt=t0+k*span/n+rng.uniform(-.01,.01)
        voice(b,lambda c,m=m:modal(N(m),GLOCK,.9,amp*(1-.04*k),.02,c),tt,rng.uniform(-.8,.8),.15)


# ===== FIRMA REFINADA =====
MOTIF=[79,86,93,90]                 # G5 D6 A6 F#6
RHY=[0.0,0.24,0.33,0.54]            # dotted-eighth / sixteenth / eighth / long  (swung "da-..di-da DAAA")
VEL=[.85,.62,.80,1.0]
PANS=[-.25,.15,-.05,.25]
def note(b,m,t,amp,pan,dur=1.4,harpamt=.55,glock=0.0):
    voice(b,lambda c:modal(N(m),CELESTA,dur,amp,.05,c),t,pan,.18)
    add(b,harp(N(m),dur*.9,amp*harpamt,cents=3),t+.004,-pan*.8,.006)
    if glock: add(b,modal(N(m+12),GLOCK,.7,amp*glock,.01),t+.002,pan*1.2)
def bowl(b,m,t,amp,dur=3.0):
    voice(b,lambda c:modal(N(m),BOWL,dur,amp,.0,c,beat=.0015),t,0,.5)

def alert():
    b=T(2.6)
    for m,t,v,p in zip(MOTIF,RHY,VEL,PANS):
        note(b,m,.02+t,.42*v,p,dur=1.5 if m==90 else 1.0)
    add(b,modal(N(67),HANDPAN,1.6,.10,.0),.02,0)          # soft G4 body under downbeat (no 7th)
    return master(reverb(b,1.3,.17),peak=.89)

def urgent():
    b=T(3.0); s=.82
    for m,t,v,p in zip(MOTIF,RHY,VEL,PANS):
        note(b,m,.02+t*s,.44*v,p,dur=.8,glock=.25)
    t2=.02+.62
    for m,t,v,p in zip(MOTIF,RHY,VEL,PANS):
        note(b,m,t2+t*s,.47*v,-p,dur=1.3 if m==90 else .8,glock=.35)
    end=t2+RHY[3]*s
    note(b,96,end+.012,.30,-.35,dur=1.3,glock=.2)           # C7 over F#6: tritone = D7 tension
    note(b,86,end+.006,.18,.35,dur=1.3)
    add(b,thump(.16),.02,0); add(b,thump(.16),t2,0)
    return master(reverb(b,1.0,.14),peak=.89)

def accepted(var):
    b=T(4.5)
    if var==1:   seq=[(93,0,.7),(91,.20,1.0)]                    # A6 -> G6, same short-long swing
    elif var==2: seq=[(86,0,.65),(90,.10,.75),(91,.28,1.0)]       # D6 F#6 -> G6 (leading tone resolves)
    else:        seq=[(83,0,.6),(86,.08,.7),(91,.24,1.0)]         # B5 D6 -> G6 rolled triad
    for i,(m,t,v) in enumerate(seq):
        note(b,m,.02+t,.40*v,[-.3,.3,0][i%3],dur=2.0 if m==91 else 1.0)
    tg=.02+seq[-1][1]
    for m,p in [(79,-.45),(83,.45),(86,0)]:                     # G major chord pad (celesta, soft)
        voice(b,lambda c,m=m:modal(N(m),CELESTA,2.2,.10,.02,c),tg+.01,p,.2)
    bowl(b,55,tg,.30,3.2)                                         # singing-bowl G3
    sparkle(b,tg+.12,[91,95,98],n=6,amp=.045,span=.45)            # glock G B D sparkle
    return master(reverb(b,2.2,.30,.03),peak=.89)*0.5          # ~ -6 dB vs alert

if __name__=='__main__':
    A=alert(); U=urgent(); acc=[accepted(i) for i in (1,2,3)]
    save(A,'alert'); save(U,'urgent')
    for i,x in enumerate(acc,1): save(x,f'accepted-{i}')
    d=T(17.0+acc[0].shape[1]/SR+.3)
    for t in (0,3.4,6.8): add(d,A[0],t,-1); add(d,A[1],t,1)
    for t in (10.2,13.6): add(d,U[0],t,-1); add(d,U[1],t,1)
    add(d,acc[0][0],17.0,-1); add(d,acc[0][1],17.0,1)
    d=d/np.sqrt(.5)                                               # undo pan law at hard L/R
    save(d*min(1,.89/np.max(np.abs(d))),'demo')
    for n,x in [('alert',A),('urgent',U)]+[(f'accepted-{i}',a) for i,a in enumerate(acc,1)]:
        print(n,round(x.shape[1]/SR,2),'s')
