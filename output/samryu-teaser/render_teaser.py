"""Reproducible ink-motion teaser edit. Existing art is never modified in place."""
from pathlib import Path
import argparse, json, math, subprocess, time, wave
import cv2
import imageio_ffmpeg
import numpy as np
from PIL import Image, ImageDraw, ImageFont
from scipy.signal import butter, sosfilt

ROOT = Path(__file__).resolve().parents[2]
OUT = Path(__file__).resolve().parent
ART = ROOT / '대진국/삼류연정/삽화'
FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()
FPS, DURATION = 30, 36
cv2.setNumThreads(2)

SCENES = [
    dict(start=0, end=4.4, art='source/rain-pavilion-brush.png', text=['스물여덟,', '삼류 표사 진소백.'], mood='rain', kind='wide', cy=.51, label='한 사람의 강호'),
    dict(start=4.4, end=8.8, art='1-1.png', text=['은비녀 하나를 품고,', '청혼하러 갔다.'], mood='dust', kind='panel', cy=.36, label='오래 기다려 온 대답'),
    dict(start=8.8, end=14, art='1-2.png', text=['그녀에게는', '남편이 있었다.'], mood='rain', kind='panel', cy=.39, label='', accent=1),
    dict(start=14, end=18.4, art='3-1.png', text=['사람마다', '때가 있는 거다.'], mood='ember', kind='panel', cy=.38, label=''),
    dict(start=18.4, end=21.8, art='6-1.png', text=['나는 남들보다'], mood='leaf', kind='panel', cy=.39, label=''),
    dict(start=21.8, end=23.4, art='2-1.png', text=[], mood='dust', kind='panel', cy=.34, label=''),
    dict(start=23.4, end=26.4, art='6-2.png', text=['늦을 뿐이야.'], mood='dust', kind='panel', cy=.43, label=''),
    dict(start=26.4, end=36, art='source/rain-pavilion-brush.png', text=[], mood='petal', kind='title', cy=.51, label=''),
]

def ease(x):
    x = np.clip(x, 0, 1)
    return x*x*(3-2*x)

def font(name, size):
    paths = {'brush':'NanumBrush.ttf', 'serif':'NanumMyeongjo.ttf', 'bold':'NanumMyeongjoBold.ttf', 'sans':'malgun.ttf', 'han':'batang.ttc'}
    return ImageFont.truetype(str(Path('C:/Windows/Fonts')/paths[name]), int(size))

def load_art(scene):
    path = OUT/scene['art'] if scene['art'].startswith('source/') else ART/scene['art']
    return np.asarray(Image.open(path).convert('RGB'))

def camera(img, w, h, u, cx=.5, cy=.5, zoom=1.0, drift=.0):
    ih, iw = img.shape[:2]
    scale = max(w/iw, h/ih)*zoom
    tx = w/2 - (cx+drift*(u-.5))*iw*scale
    ty = h/2 - (cy+.018*(u-.5))*ih*scale
    tx = min(0,max(w-iw*scale,tx))
    ty = min(0,max(h-ih*scale,ty))
    mat = np.array([[scale,0,tx],[0,scale,ty]],np.float32)
    return cv2.warpAffine(img,mat,(w,h),flags=cv2.INTER_LINEAR,borderMode=cv2.BORDER_REFLECT_101)

class Renderer:
    def __init__(self, aspect, scale=1):
        self.portrait = aspect=='portrait'
        self.w,self.h = ((1080,1920) if self.portrait else (1920,1080))
        self.w,self.h = int(self.w*scale),int(self.h*scale)
        self.s=self.w/1080 if self.portrait else self.h/1080
        self.images=[load_art(sc) for sc in SCENES]
        self.rng = np.random.default_rng(1739)
        self.x=np.linspace(0,1,self.w,dtype=np.float32)[None,:]
        self.y=np.linspace(0,1,self.h,dtype=np.float32)[:,None]
        # A fixed paper texture and a fixed brush field avoid frame-to-frame flicker.
        fine=self.rng.normal(0,1.1,(self.h,self.w)).astype(np.float32)
        coarse=cv2.resize(self.rng.normal(0,1,(96,96)).astype(np.float32),(self.w,self.h),interpolation=cv2.INTER_CUBIC)
        paper=np.zeros((self.h,self.w,3),np.float32)+np.array([228,218,193],np.float32)
        self.paper=np.clip(paper+(fine+coarse*1.8)[...,None],0,255).astype(np.uint8)
        self.darkpaper=np.clip(self.paper.astype(np.float32)*np.array([.086,.106,.104]),0,255).astype(np.uint8)
        field=cv2.resize(self.rng.random((52,78)).astype(np.float32),(self.w,self.h),interpolation=cv2.INTER_CUBIC)
        bristles=.045*np.sin(self.y*251)+.026*np.sin(self.y*887)+.034*(field-.5)
        self.brush=(.82*self.x+.17*self.y+bristles).astype(np.float32)
        self.vignette=np.clip(((self.x-.5)**2*1.0+(self.y-.48)**2*.8)*.30,0,.17)
        self.particles=self.rng.random((95,6))
        self.overlays=[self.make_text(i) for i in range(len(SCENES))]

    def text_layer(self):
        return Image.new('RGBA',(self.w,self.h),(0,0,0,0))

    def tracked(self, draw, text, f, xy, fill, tracking=0):
        xx,yy=xy
        for ch in text:
            draw.text((int(xx),int(yy)),ch,font=f,fill=fill,anchor='lt')
            xx+=draw.textlength(ch,font=f)+tracking

    def make_text(self,i):
        sc=SCENES[i]; layer=self.text_layer(); d=ImageDraw.Draw(layer)
        s=self.s; W,H=self.w,self.h
        pale=(243,232,206,255); ink=(34,39,35,255); red=(174,54,43,255)
        if sc['kind']=='title':
            if self.portrait:
                x,y=W*.5,H*.26; f=font('brush',240*s)
                d.text((x,y),'삼류연정',font=f,fill=pale,anchor='mt')
                d.text((x,y+270*s),'三 流 戀 情',font=font('han',39*s),fill=(205,178,126,255),anchor='mt')
                d.text((x,y+406*s),'한 사람의 강호',font=font('serif',49*s),fill=pale,anchor='mt')
                d.text((x,y+482*s),'천고의 첫 번째 이야기',font=font('sans',28*s),fill=(208,204,184,255),anchor='mt')
                sx,sy=W*.5-36*s,y-119*s
            else:
                x,y=W*.08,H*.275; f=font('brush',285*s)
                d.text((x,y),'삼류연정',font=f,fill=pale,anchor='lt')
                d.text((x+16*s,y+303*s),'三 流 戀 情',font=font('han',34*s),fill=(205,178,126,255),anchor='lt')
                d.text((x+16*s,y+407*s),'한 사람의 강호',font=font('serif',43*s),fill=pale,anchor='lt')
                d.text((x+16*s,y+479*s),'천고의 첫 번째 이야기',font=font('sans',25*s),fill=(208,204,184,255),anchor='lt')
                sx,sy=x+17*s,y-95*s
            d.rounded_rectangle((sx,sy,sx+72*s,sy+72*s),radius=2*s,fill=(143,43,34,255),outline=(211,131,93,255),width=max(1,int(2*s)))
            d.text((sx+36*s,sy+37*s),'천고',font=font('serif',27*s),fill=pale,anchor='mm')
            if self.portrait:
                cy=H-290*s
                lines=['Music · Eastminster — Kevin MacLeod','incompetech.com · CC BY 4.0','음원 발췌 · 페이드 및 효과음 편집']
                for j,t in enumerate(lines):d.text((W*.5,cy+j*36*s),t,font=font('sans',23*s),fill=(210,208,190,255),anchor='mt')
            else:
                cy=H-141*s
                for j,t in enumerate(['Music · Eastminster — Kevin MacLeod · incompetech.com','CC BY 4.0 · 음원 발췌 · 페이드 및 효과음 편집']):
                    d.text((x+16*s,cy+j*31*s),t,font=font('sans',20*s),fill=(210,208,190,255),anchor='lt')
            return np.asarray(layer).copy()
        if not sc['text']: return np.asarray(layer).copy()
        if self.portrait:
            x,y=W*.105,H*.705
            size=67*s if i==2 else 57*s
            ff=font('bold',size)
            for j,t in enumerate(sc['text']):
                color=(242,233,211,255)
                if sc.get('accent')==j:color=(233,167,138,255)
                d.text((x,y+j*(size+24*s)),t,font=ff,fill=color,anchor='lt')
            if sc['label']:d.text((x,y-62*s),sc['label'],font=font('sans',26*s),fill=(217,207,177,255),anchor='lt')
        else:
            x,y=W*.074,H*.39
            size=66*s if i==2 else 51*s
            ff=font('bold',size)
            for j,t in enumerate(sc['text']):
                color=red if sc.get('accent')==j else ink
                d.text((x,y+j*(size+27*s)),t,font=ff,fill=color,anchor='lt')
            if sc['label']:d.text((x,y-57*s),sc['label'],font=font('sans',24*s),fill=(100,83,58,255),anchor='lt')
        return np.asarray(layer).copy()

    def composite(self,bg,fg,alpha):
        if np.ndim(alpha)==3:alpha=alpha[:,:,0]
        alpha=np.ascontiguousarray(alpha,dtype=np.float32)
        return cv2.blendLinear(bg,fg,1-alpha,alpha)

    def ink_mask(self,u):
        if u<=0:return np.zeros((self.h,self.w),np.float32)
        if u>=1:return np.ones((self.h,self.w),np.float32)
        return np.clip((u*1.24-.10-self.brush)/.09+.5,0,1)

    def scene_frame(self,i,local,global_t, text=True):
        sc=SCENES[i]; u=np.clip(local/(sc['end']-sc['start']),0,1)
        w,h,s=self.w,self.h,self.s
        image=self.images[i]
        if self.portrait:
            cx=.80 if sc['kind']=='wide' else .53
            if sc['kind']=='title':cx=.75
            frame=camera(image,w,h,u,cx=cx,cy=sc['cy'],zoom=1.025+.055*u,drift=.035)
            if sc['kind']=='title':
                frame=self.composite(frame,self.darkpaper,np.full((h,w),.70,np.float32))
            else:
                shade=np.clip((self.y-.43)/.46,0,1)*.86
                frame=self.composite(frame,self.darkpaper,np.broadcast_to(shade,(h,w)))
                frame=self.composite(frame,self.darkpaper,np.full((h,w),.09,np.float32))
        elif sc['kind']=='panel':
            panel=camera(image,w-int(w*.39),h,u,cx=.54,cy=sc['cy'],zoom=1.02+.04*u,drift=.027)
            full=np.zeros((h,w,3),np.uint8);full[:]=self.paper
            full[:,int(w*.39):]=panel
            # Irregular dry-brush edge merges the portrait composition into paper.
            edge=np.clip((self.x-.355+.016*np.sin(self.y*63)+.009*np.sin(self.y*197))/.085,0,1)
            frame=self.composite(self.paper,full,np.broadcast_to(edge,(h,w)))
        else:
            frame=camera(image,w,h,u,cx=.52,cy=.51,zoom=1.015+.04*u,drift=.016)
            if sc['kind']=='title':
                darkness=np.clip(.84-.32*self.x,0,1)
                frame=self.composite(frame,self.darkpaper,np.broadcast_to(darkness,(h,w)))
            else:
                veil=np.clip((.48-self.x)/.45,0,1)*.65
                frame=self.composite(frame,self.paper,np.broadcast_to(veil,(h,w)))
        frame=self.composite(frame,self.darkpaper,self.vignette)
        frame=self.atmosphere(frame,sc['mood'],global_t)
        if text and (sc['text'] or sc['kind']=='title'):
            overlay=self.overlays[i]
            appear=ease((local-.45)/1.05)
            disappear=1 if sc['kind']=='title' else 1-ease((local-(sc['end']-sc['start'])+.60)/.48)
            if sc['kind']=='title':
                # Ink runs left-to-right along each calligraphic line, not a flickering opacity flash.
                reveal=np.clip((local-.7)*.95-self.x-.023*np.sin(self.y*371),0,.19)/.19
                a=overlay[:,:,3].astype(np.float32)/255*reveal
                # Credits enter only after the title settles.
                cutoff=int(h-(290 if self.portrait else 141)*s)
                a[cutoff:]*=ease((local-2.7)/1.0)
            else:
                a=overlay[:,:,3].astype(np.float32)/255*float(appear*disappear)
            frame=self.composite(frame,overlay[:,:,:3],a)
            if sc['kind']=='title':
                # A slender bristle line is drawn under the title in real time.
                p=ease((local-1.4)/1.2)
                if self.portrait:x0,x1,yy=.19*w,.81*w,.26*h+362*s
                else:x0,x1,yy=.081*w,.43*w,.275*h+363*s
                end=x0+(x1-x0)*p
                pil=Image.fromarray(frame);d=ImageDraw.Draw(pil)
                for k in range(6):
                    offset=math.sin(k*3.7)*2*s
                    d.line([(x0,yy+offset),(end,yy+offset+math.sin(k)*s)],fill=(166+k*6,138+k*5,90+k*5),width=max(1,int(s)))
                frame=np.asarray(pil).copy()
        return frame

    def atmosphere(self,frame,mood,t):
        pil=Image.fromarray(frame);d=ImageDraw.Draw(pil,'RGBA');w,h,s=self.w,self.h,self.s
        if mood=='rain':
            for a,b,c,v,sz,ph in self.particles[:65]:
                xx=((a+t*(.013+.014*v))%1)*w
                yy=((b+t*(.28+.31*v))%1)*h
                ll=(11+24*sz)*s
                d.line((xx,yy,xx-ll*.2,yy+ll),fill=(232,221,199,int(22+30*c)),width=max(1,int(s)))
            # Quiet circular ripples on the bottom water plane.
            for k,(a,b,c,v,sz,ph) in enumerate(self.particles[:10]):
                life=(t*.52+ph)%1; rr=(8+life*36)*s
                xx=(.15+a*.74)*w;yy=(.88+.08*b)*h
                d.ellipse((xx-rr*2.2,yy-rr*.26,xx+rr*2.2,yy+rr*.26),outline=(208,189,153,int(25*(1-life))),width=max(1,int(s)))
        else:
            number=18 if mood in ['leaf','petal'] else 28
            for a,b,c,v,sz,ph in self.particles[:number]:
                xx=((a+t*(.016+.020*v))%1)*w+math.sin(t*.8+ph*8)*14*s
                yy=((b+t*(-.025 if mood=='ember' else .022))%1)*h
                rr=(1+sz*3)*s
                if mood=='ember':color=(233,158,75,int(50+100*c))
                elif mood=='petal':color=(169,57,45,int(75+75*c))
                elif mood=='leaf':color=(93,85,46,int(50+65*c))
                else:color=(206,184,136,int(35+55*c))
                if mood in ['leaf','petal']:
                    rot=t*(.6+v)+ph*8;dx=math.cos(rot)*rr*2;dy=math.sin(rot)*rr*1.4
                    d.polygon([(xx-dx,yy-dy),(xx+dy*.8,yy-dx*.6),(xx+dx,yy+dy),(xx-dy*.8,yy+dx*.6)],fill=color)
                else:d.ellipse((xx-rr,yy-rr,xx+rr,yy+rr),fill=color)
        return np.asarray(pil).copy()

    def frame(self,t):
        i=next((j for j,sc in enumerate(SCENES) if sc['start']<=t<sc['end']),len(SCENES)-1)
        sc=SCENES[i];local=t-sc['start']
        current=self.scene_frame(i,local,t)
        transition=.75 if i!=5 else .38
        if i>0 and local<transition:
            previous=self.scene_frame(i-1,SCENES[i-1]['end']-SCENES[i-1]['start']+local,t,text=False)
            current=self.composite(previous,current,self.ink_mask(local/transition))
        if t<.8:current=self.composite(self.darkpaper,current,np.full((self.h,self.w),ease(t/.8),np.float32))
        if t>DURATION-.85:current=self.composite(current,self.darkpaper,np.full((self.h,self.w),ease((t-DURATION+.85)/.85),np.float32))
        return current

def soundtrack():
    sr=48000;n=int(DURATION*sr);rng=np.random.default_rng(932)
    noise=rng.standard_normal(n)
    rain=sosfilt(butter(2,[900,5800],fs=sr,btype='bandpass',output='sos'),noise)*.010
    time_axis=np.arange(n)/sr
    rain*=np.clip(1-time_axis/28,0,1)*np.clip(time_axis,0,1)
    fx=rain.copy()
    for sc in SCENES[1:]:
        start=int((sc['start']-.1)*sr);dur=.80 if sc['start']!=21.8 else .4;count=int(dur*sr)
        tt=np.arange(count)/sr
        hiss=sosfilt(butter(2,[240,1900],fs=sr,btype='bandpass',output='sos'),rng.standard_normal(count))
        hiss*=np.sin(np.pi*tt/dur)**2*.027
        fx[start:start+count]+=hiss
    # A restrained low gong-like arrival on the central revelation and final title.
    for start_at in [8.8,26.4]:
        count=int(2.3*sr);tt=np.arange(count)/sr
        hit=(np.sin(2*np.pi*63*tt)+.35*np.sin(2*np.pi*137*tt)+.14*np.sin(2*np.pi*271*tt))*np.exp(-tt*2.6)*np.minimum(tt*80,1)*.10
        start=int(start_at*sr);fx[start:start+count]+=hit
    # The silver hairpin gets one delicate, decaying metallic accent.
    tt=np.arange(int(1.8*sr))/sr
    chime=(np.sin(2*np.pi*1318.5*tt)*np.exp(-tt*4)+.25*np.sin(2*np.pi*2637*tt)*np.exp(-tt*7))*.031
    start=int(5.3*sr);fx[start:start+len(chime)]+=chime
    fx*=np.clip((DURATION-time_axis)/1.2,0,1)
    stereo=np.stack([fx,np.roll(fx,173)*.94],axis=1)
    pcm=np.clip(stereo*32767,-32768,32767).astype('<i2')
    with wave.open(str(OUT/'source/sound-design.wav'),'wb') as wf:
        wf.setnchannels(2);wf.setsampwidth(2);wf.setframerate(sr);wf.writeframes(pcm.tobytes())
    cmd=[FFMPEG,'-y','-hide_banner','-loglevel','error','-i',str(ROOT/'assets/audio/eastminster.mp3'),'-i',str(OUT/'source/sound-design.wav'),'-filter_complex',
        f'[0:a]atrim=start=0:end={DURATION},asetpts=PTS-STARTPTS,volume=0.46,afade=t=in:d=2,afade=t=out:st=33:d=3[m];[m][1:a]amix=inputs=2:normalize=0,alimiter=limit=0.92[a]',
        '-map','[a]','-ar','48000','-c:a','pcm_s16le',str(OUT/'source/soundtrack.wav')]
    subprocess.run(cmd,check=True)

def previews():
    for aspect in ['landscape','portrait']:
        r=Renderer(aspect,.45)
        stamps=[2.8,6.7,11.5,16.3,20,24.7,30.8]
        thumbs=[]
        for t in stamps:
            f=Image.fromarray(r.frame(t))
            f.save(OUT/'source'/f'preview-{aspect}-{t}.jpg',quality=93)
            f.thumbnail((384,530))
            thumbs.append(f)
        gap=12;cols=4 if aspect=='landscape' else 7;rows=math.ceil(len(thumbs)/cols)
        cw=max(i.width for i in thumbs);ch=max(i.height for i in thumbs)+35
        sheet=Image.new('RGB',(cols*(cw+gap)+gap,rows*(ch+gap)+gap),(28,32,29));d=ImageDraw.Draw(sheet)
        for j,(im,t) in enumerate(zip(thumbs,stamps)):
            x=gap+(j%cols)*(cw+gap);y=gap+(j//cols)*(ch+gap)
            sheet.paste(im,(x,y));d.text((x,y+im.height+8),f'{t:.1f}s',fill=(222,212,185),font=font('sans',18))
        sheet.save(OUT/f'storyboard-{aspect}.jpg',quality=94)

def render(aspect):
    r=Renderer(aspect);out=OUT/f'삼류연정-티저-{aspect}.mp4'
    log=OUT/'source'/f'encode-{aspect}.log'
    credit='Eastminster - Kevin MacLeod (incompetech.com), CC BY 4.0 https://creativecommons.org/licenses/by/4.0/ ; excerpt, fades and added sound design'
    cmd=[FFMPEG,'-y','-hide_banner','-loglevel','warning','-f','rawvideo','-pixel_format','rgb24','-video_size',f'{r.w}x{r.h}','-framerate',str(FPS),'-i','pipe:0','-i',str(OUT/'source/soundtrack.wav'),'-map','0:v:0','-map','1:a:0','-c:v','libx264','-preset','fast','-crf','18','-pix_fmt','yuv420p','-r',str(FPS),'-af','loudnorm=I=-18:TP=-1.5:LRA=11','-c:a','aac','-b:a','256k','-ar','48000','-t',str(DURATION),'-movflags','+faststart','-metadata','title=삼류연정 | 한 사람의 강호','-metadata','comment='+credit,'-metadata','description=수묵 모션 티저 | '+aspect,str(out)]
    begin=time.monotonic()
    with log.open('wb') as lf:
        proc=subprocess.Popen(cmd,stdin=subprocess.PIPE,stderr=lf)
        try:
            for n in range(DURATION*FPS):
                proc.stdin.write(r.frame(n/FPS).tobytes())
                if n%150==0:print(json.dumps({'aspect':aspect,'seconds':round(n/FPS,1),'total':DURATION,'elapsed':round(time.monotonic()-begin)},ensure_ascii=False),flush=True)
            proc.stdin.close()
            code=proc.wait()
        except Exception:
            proc.stdin.close();proc.wait();raise
    if code:raise RuntimeError(log.read_text(errors='replace'))
    print(json.dumps({'done':str(out),'bytes':out.stat().st_size,'elapsed':round(time.monotonic()-begin)},ensure_ascii=False),flush=True)

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('mode',choices=['prepare','landscape','portrait']);a=parser.parse_args()
    if a.mode=='prepare':soundtrack();previews()
    else:render(a.mode)
