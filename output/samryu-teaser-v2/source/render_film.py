"""Layered ink-motion edit. Generated paintings and references remain untouched."""
from pathlib import Path
import argparse, json, math, subprocess, time, wave
import cv2, imageio_ffmpeg
import numpy as np
from PIL import Image, ImageDraw, ImageFont
from scipy.signal import butter, sosfilt

OUT = Path(__file__).resolve().parents[1]
ROOT = OUT.parents[1]
ART = OUT / 'art'
FF = imageio_ffmpeg.get_ffmpeg_exe()
FPS, DURATION = 30, 40
cv2.setNumThreads(2)
PLAN = json.loads((OUT/'source/film-plan.json').read_text(encoding='utf-8'))['shots']

def ease(x):
    x = np.clip(x,0,1)
    return x*x*(3-2*x)

def smooth(x):
    x = np.clip(x,0,1)
    return x*x*x*(x*(x*6-15)+10)

def font(kind,size):
    names = {'brush':'NanumBrush.ttf','serif':'NanumMyeongjo.ttf','bold':'NanumMyeongjoBold.ttf','han':'batang.ttc','sans':'malgun.ttf'}
    return ImageFont.truetype('C:/Windows/Fonts/'+names[kind],max(10,int(size)))

def blend(bg,fg,a):
    if np.ndim(a)==0:
        return cv2.addWeighted(bg,1-float(a),fg,float(a),0)
    return cv2.blendLinear(bg,fg,np.ascontiguousarray(1-a,dtype=np.float32),np.ascontiguousarray(a,dtype=np.float32))

def cover(image,w,h,cx=.5,cy=.5,zoom=1):
    ih,iw=image.shape[:2]
    scale=max(w/iw,h/ih)*zoom
    tx=np.clip(w*.5-cx*iw*scale,w-iw*scale,0)
    ty=np.clip(h*.5-cy*ih*scale,h-ih*scale,0)
    return cv2.warpAffine(image,np.float32([[scale,0,tx],[0,scale,ty]]),(w,h),flags=cv2.INTER_LINEAR,borderMode=cv2.BORDER_REFLECT_101)

def brush_polygon(points,radii,w,h):
    """A tapered, continuous brush gesture, rather than noisy random scratches."""
    points=np.asarray(points,np.float32)*[w,h]
    radii=np.asarray(radii,np.float32)*min(w,h)
    dx=np.gradient(points[:,0]);dy=np.gradient(points[:,1]);norm=np.sqrt(dx*dx+dy*dy)+1e-6
    left=points+np.stack([-dy/norm,dx/norm],axis=1)*radii[:,None]
    right=points-np.stack([-dy/norm,dx/norm],axis=1)*radii[:,None]
    return np.concatenate([left,right[::-1]]).astype(np.int32)

class Film:
    def __init__(self,aspect,scale=1):
        self.portrait=aspect=='portrait'
        self.w,self.h=((1080,1920) if self.portrait else (1920,1080))
        self.w,self.h=int(self.w*scale),int(self.h*scale)
        self.s=min(self.w,self.h)/1080
        self.rng=np.random.default_rng(2419)
        self.x=np.linspace(0,1,self.w,dtype=np.float32)[None,:]
        self.y=np.linspace(0,1,self.h,dtype=np.float32)[:,None]
        self.paper=np.full((self.h,self.w,3),[243,236,223],np.uint8)
        self.black=np.full_like(self.paper,[18,19,18])
        self.art={p.stem:np.asarray(Image.open(p).convert('RGBA' if Image.open(p).mode=='RGBA' else 'RGB')).copy() for p in ART.glob('*.png')}
        self.fields=[self.make_field(k) for k in range(4)]
        self.particles=self.rng.random((14,7))
        self.branch=self.art.get('10-plum-branch',self.make_branch())
        self.title_ink,self.title_times=self.make_title_ink()
        self.text={sc['scene']:self.make_caption(sc['scene']) for sc in PLAN if 'text' in sc and sc['scene']!='title'}
        self.title_layers=self.make_titles()
        self.foreground=self.make_world_foreground()
        # Soft moving mist is a low-frequency wash, never a changing grain texture.
        sm=self.rng.random((18,36)).astype(np.float32)
        sm=cv2.GaussianBlur(sm,(0,0),1.7)
        self.mist=cv2.resize(sm,(self.w,self.h),interpolation=cv2.INTER_CUBIC)
        self.mist=(self.mist-self.mist.min())/(self.mist.max()-self.mist.min())

    def make_field(self,kind):
        ww,hh=(480,int(480*self.h/self.w))
        xx=np.linspace(0,1,ww,dtype=np.float32)[None,:]
        yy=np.linspace(0,1,hh,dtype=np.float32)[:,None]
        coarse=self.rng.normal(0,1,(13,19)).astype(np.float32)
        coarse=cv2.GaussianBlur(coarse,(0,0),.8)
        noise=cv2.resize(coarse,(ww,hh),interpolation=cv2.INTER_CUBIC)
        if kind==0:
            f=.64*xx+.36*(1-yy)+.045*np.sin(yy*19)+noise*.047
        elif kind==1:
            f=.22*xx+.78*yy+.047*np.sin(xx*21)+noise*.045
        elif kind==2:
            f=np.sqrt(((xx-.50)*.87)**2+((yy-.57)*.92)**2)+noise*.038
        else:
            f=.77*(1-xx)+.23*yy+.036*np.sin(yy*24)+noise*.04
        f=(f-f.min())/(f.max()-f.min())
        return cv2.resize(f,(self.w,self.h),interpolation=cv2.INTER_LINEAR)

    def ink(self,u,kind=0):
        if u<=0:return np.zeros((self.h,self.w),np.float32)
        if u>=1:return np.ones((self.h,self.w),np.float32)
        return np.clip((float(u)*1.14-.06-self.fields[kind])/.064+.5,0,1)

    def cutout(self,base,key,height,cx,top,opacity=1,tilt=0):
        im=self.art[key]; ih,iw=im.shape[:2]; sc=height*self.h/ih
        mat=cv2.getRotationMatrix2D((iw*.5,ih*.5),tilt,sc)
        # The pivot belongs to image coordinates before translation.
        mat[0,2]+=cx*self.w-iw*.5
        mat[1,2]+=top*self.h+ih*sc*.5-ih*.5
        rgba=cv2.warpAffine(im,mat,(self.w,self.h),flags=cv2.INTER_LINEAR,borderMode=cv2.BORDER_CONSTANT,borderValue=(0,0,0,0))
        return blend(base,rgba[:,:,:3],rgba[:,:,3].astype(np.float32)*(opacity/255))

    def make_world_foreground(self):
        im=self.art['08-world']
        # Actual painted near plum tree/eaves. White/grey mountain areas stay behind.
        grey=cv2.cvtColor(im,cv2.COLOR_RGB2GRAY).astype(np.float32)/255
        hh,ww=grey.shape
        xx=np.linspace(0,1,ww)[None,:];yy=np.linspace(0,1,hh)[:,None]
        left=np.clip((.30-xx)/.08,0,1)*np.clip((.46-grey)/.18,0,1)
        right=np.clip((xx-.89)/.05,0,1)*np.clip((.42-grey)/.18,0,1)*np.clip((.67-yy)/.12,0,1)
        a=np.maximum(left,right)
        return np.dstack([im,(a*255).astype(np.uint8)])

    def make_branch(self):
        w,h=self.w,self.h
        layer=np.zeros((h,w,4),np.uint8)
        for start,end,width in [((-.12,.12),(.40,.32),.038),((.18,.22),(.33,.03),.009),((.29,.28),(.54,.16),.007),((.10,.18),(.19,.42),.010)]:
            u=np.linspace(0,1,40)
            xx=start[0]+(end[0]-start[0])*u
            yy=start[1]+(end[1]-start[1])*u+.016*np.sin(u*math.pi*2)
            radius=width*(1-u)**.7+.001
            pts=brush_polygon(np.stack([xx,yy],axis=1),radius,w,h)
            cv2.fillPoly(layer,[pts],(23,23,21,225))
        return layer

    def near_branch(self,frame,u,amount=1):
        # Near objects pass faster than faces/architecture; one smooth motion.
        bh,bw=self.branch.shape[:2]
        scale=self.w/bw*(1.44 if self.portrait else 1.28)
        dx=(-.38+.20*u)*self.w
        dy=(.64 if self.portrait else .66)*self.h
        layer=cv2.warpAffine(self.branch,np.float32([[scale,0,dx],[0,scale,dy]]),(self.w,self.h),flags=cv2.INTER_LINEAR)
        return blend(frame,layer[:,:,:3],layer[:,:,3].astype(np.float32)*(amount/255))

    def mist_layer(self,frame,t,weight=.12,low=True):
        dx=math.sin(t*.18)*self.w*.042
        field=cv2.warpAffine(self.mist,np.float32([[1,0,dx],[0,1,0]]),(self.w,self.h),borderMode=cv2.BORDER_REFLECT_101)
        a=field*weight
        if low:a*=np.clip((self.y-.38)/.6,0,1)
        return blend(frame,self.paper,a)

    def petals(self,frame,t,number=7,weight=1):
        layer=np.zeros((self.h,self.w,4),np.uint8)
        for j,(a,b,v,z,sz,phase,speed) in enumerate(self.particles[:number]):
            x=((a+t*(.018+.018*speed))%1)*self.w
            y=((b+t*(.014+.01*v))%1)*self.h
            x+=math.sin(t*.68+phase*8)*(13+20*z)*self.s
            r=(5+14*z)*self.s
            angle=t*(.9+v)+phase*8
            pts=np.array([[-1,-.1],[-.7,-.72],[.08,-.85],[1,.1],[.58,.68],[-.16,.74]],np.float32)
            rot=np.float32([[math.cos(angle),-math.sin(angle)],[math.sin(angle),math.cos(angle)]])
            pts=(pts@rot.T*r+[x,y]).astype(np.int32)
            color=(150+int(16*a),42+int(18*b),35+int(14*b))
            # No blinking life cycle. Petals stay continuous as they travel off frame.
            cv2.fillPoly(layer,[pts],(*color,int(255*weight*(.64+.36*z))),lineType=cv2.LINE_AA)
        return blend(frame,layer[:,:,:3],layer[:,:,3].astype(np.float32)/255)

    def make_caption(self,kind):
        layer=Image.new('RGBA',(self.w,self.h),(0,0,0,0));d=ImageDraw.Draw(layer)
        ink=(34,34,30,255);red=(145,44,34,255);s=self.s;w,h=self.w,self.h
        if kind=='seo':
            if self.portrait:xy=(w*.50,h*.075);anchor='mt';size=80*s
            else:xy=(w*.12,h*.37);anchor='lt';size=91*s
            d.text(xy,'그녀에게는',font=font('brush',size*1.40),fill=ink,anchor=anchor)
        elif kind=='jin':
            if self.portrait:xy=(w*.50,h*.09);anchor='mt';size=78*s
            else:xy=(w*.77,h*.45);anchor='mt';size=88*s
            d.text(xy,'남편이 있었다.',font=font('brush',size*1.4),fill=red,anchor=anchor)
        elif kind=='training':
            if self.portrait:
                d.text((w*.5,h*.095),'사람마다',font=font('brush',102*s),fill=ink,anchor='mt')
                d.text((w*.5,h*.16),'때가 있는 거다.',font=font('brush',102*s),fill=ink,anchor='mt')
            else:
                d.text((w*.055,h*.76),'사람마다',font=font('brush',104*s),fill=ink,anchor='lt')
                d.text((w*.055,h*.85),'때가 있는 거다.',font=font('brush',104*s),fill=ink,anchor='lt')
        elif kind=='walker':
            if self.portrait:
                d.text((w*.50,h*.105),'나는 남들보다',font=font('brush',112*s),fill=ink,anchor='mt')
                d.text((w*.50,h*.181),'늦을 뿐이야.',font=font('brush',112*s),fill=ink,anchor='mt')
            else:
                d.text((w*.67,h*.31),'나는 남들보다',font=font('brush',122*s),fill=ink,anchor='mt')
                d.text((w*.67,h*.43),'늦을 뿐이야.',font=font('brush',122*s),fill=ink,anchor='mt')
        return np.asarray(layer).copy()

    def caption(self,frame,kind,local,end):
        if kind not in self.text:return frame
        layer=self.text[kind]
        delay=.50 if kind in ['seo','jin'] else .8
        reveal=self.ink((local-delay)/.90,kind=0)
        out=1-ease((local-end+.35)/.35)
        return blend(frame,layer[:,:,:3],layer[:,:,3].astype(np.float32)/255*reveal*out)

    def make_title_ink(self):
        w,h=self.w,self.h
        if '11-title-wash' in self.art:
            source=self.art['11-title-wash']
            # Frame the painted alpha silhouette, leaving one unbroken center.
            alpha=source[:,:,3]
            yy,xx=np.where(alpha>12)
            crop=alpha[yy.min():yy.max()+1,xx.min():xx.max()+1]
            target_h=int(h*(.37 if self.portrait else .50))
            target_w=int(w*1.17)
            crop=cv2.resize(crop,(target_w,target_h),interpolation=cv2.INTER_LINEAR)
            mask=np.zeros((h,w),np.uint8)
            y0=int(h*(.33 if self.portrait else .28));x0=-int(w*.085)
            mask[y0:y0+target_h]=crop[:, -x0:-x0+w]
            times=self.fields[0]*1.1
            return mask.astype(np.float32)/255,times
        mask=np.zeros((h,w),np.uint8)
        times=np.full((h,w),100,np.float32)
        if self.portrait:
            routes=[((-.15,.38),(1.12,.49),.12),((1.13,.53),(-.12,.64),.095),((-.12,.57),(.99,.72),.080)]
        else:
            routes=[((-.12,.31),(1.12,.49),.155),((1.08,.52),(-.13,.68),.11),((-.1,.62),(.90,.78),.068)]
        for k,(start,end,width) in enumerate(routes):
            u=np.linspace(0,1,100)
            xx=start[0]+(end[0]-start[0])*u
            yy=start[1]+(end[1]-start[1])*u+.015*np.sin(u*9+k)
            radius=width*np.sin(np.pi*np.clip(u*.87+.08,0,1))**.52
            # Large dry brush shape, without speckled distress or a rectangular box.
            radius*=1+.037*np.sin(u*47+k)
            pts=brush_polygon(np.stack([xx,yy],axis=1),radius,w,h)
            temp=np.zeros_like(mask);cv2.fillPoly(temp,[pts],255,lineType=cv2.LINE_AA)
            route_time=k*.24+((self.x if end[0]>start[0] else 1-self.x)*.74)
            times=np.minimum(times,np.where(temp>0,route_time,100))
            mask=np.maximum(mask,temp)
        mask=cv2.GaussianBlur(mask,(0,0),1.3*self.s)
        return mask.astype(np.float32)/255,times

    def make_titles(self):
        result=[];w,h,s=self.w,self.h,self.s
        title=Image.new('RGBA',(w,h),(0,0,0,0));d=ImageDraw.Draw(title)
        size=(265 if self.portrait else 356)*s
        ff=font('brush',size)
        maxwidth=w*.85
        while d.textlength('삼류연정',font=ff)>maxwidth:
            size*=.96;ff=font('brush',size)
        y=h*(.445 if self.portrait else .405)
        d.text((w*.50,y),'삼류연정',font=ff,fill=(246,240,224,255),anchor='mt')
        result.append((np.asarray(title).copy(),.92,1.40))
        small=Image.new('RGBA',(w,h),(0,0,0,0));d=ImageDraw.Draw(small)
        d.text((w*.50,h*(.72 if self.portrait else .755)),'三 流 戀 情',font=font('han',35*s),fill=(51,51,44,255),anchor='mt')
        result.append((np.asarray(small).copy(),2.15,.85))
        tagline=Image.new('RGBA',(w,h),(0,0,0,0));d=ImageDraw.Draw(tagline)
        d.text((w*.50,h*(.80 if self.portrait else .85)),'한 사람의 강호',font=font('brush',83*s),fill=(31,34,30,255),anchor='mt')
        result.append((np.asarray(tagline).copy(),2.65,.85))
        return result

    def world(self,u,t,walker=False):
        w,h=self.w,self.h
        image=self.art['09-road'] if walker else self.art['08-world']
        # Establishing shot accelerates down the canal. Walking shot breathes outward.
        zoom=(1.02+.22*(u*u)) if not walker else (1.13-.07*ease(u))
        cx=(.45 if walker else .55) if self.portrait else .51+.017*u
        cy=.48 if self.portrait else .52+.035*u
        frame=cover(image,w,h,cx=cx,cy=cy,zoom=zoom)
        # Water lines slowly displace; camera and wash do most of the work.
        if not self.portrait and not walker:
            start=int(h*.76);roi=frame[start:].copy();rh=roi.shape[0]
            mx,my=np.meshgrid(np.arange(w,dtype=np.float32),np.arange(rh,dtype=np.float32))
            mx+=np.sin(my/19+t*.95)*1.8*self.s
            frame[start:]=cv2.remap(roi,mx,my,cv2.INTER_LINEAR,borderMode=cv2.BORDER_REFLECT_101)
        frame=self.mist_layer(frame,t,.16)
        if walker:
            # Far landscape and a nearer figure move independently. A small upward
            # body arc follows the camera, with no false articulated walk cycle.
            if self.portrait:
                height=.52-.035*u;cx=.53+.016*u;top=.44+.013*math.sin(u*math.pi)
            else:
                height=.77-.04*u;cx=.42+.014*u;top=.20+.008*math.sin(u*math.pi)
            frame=self.cutout(frame,'07-walker-cutout',height,cx,top,tilt=-.5+.8*u)
        if not walker:
            fg=cover(self.foreground,w,h,cx=cx-.04*u,cy=cy,zoom=zoom+.075*u)
            frame=blend(frame,fg[:,:,:3],fg[:,:,3].astype(np.float32)/255*.55)
        if self.portrait and not walker:
            frame=self.near_branch(frame,u,.52)
        frame=self.petals(frame,t,7,.73)
        return frame

    def shot(self,index,local,t,with_text=True):
        sc=PLAN[index];kind=sc['scene'];duration=sc['end']-sc['start'];u=np.clip(local/duration,0,1)
        w,h=self.w,self.h
        if kind=='hairpin':
            frame=cover(self.art['01-hairpin'],w,h,cx=.61 if self.portrait else .55,cy=.48,zoom=1.03+.12*smooth(u))
            if local<1.75:
                frame=blend(self.paper,frame,self.ink(local/1.75,0))
            frame=self.mist_layer(frame,t,.06,False)
            # The silver glint swells once, gently, on the opening note.
        elif kind=='proposal':
            key='03-proposal-portrait' if self.portrait else '02-proposal-wide'
            frame=cover(self.art[key],w,h,cx=.53+.009*u,cy=.52-.02*u,zoom=1.01+.13*u*u)
            frame=self.petals(frame,t,3,.45)
        elif kind in ['seo','jin']:
            frame=blend(self.paper,cover(self.art['08-world'],w,h,cx=.68 if kind=='seo' else .34,cy=.36,zoom=1.28),.075)
            frame=self.mist_layer(frame,t,.09,False)
            if self.portrait:
                height=1.01+.055*u;cx=.51;top=.235-.015*u
            else:
                height=1.45+.065*u;cx=.74-.023*u if kind=='seo' else .29+.017*u;top=-.045
            key='04-seo-cutout' if kind=='seo' else '05-jin-cutout'
            frame=self.cutout(frame,key,height,cx,top)
            if kind=='seo':frame=self.near_branch(frame,u,.68)
            frame=self.petals(frame,t,3,.45)
        elif kind=='world':
            frame=self.world(u,t)
        elif kind in ['training','training-detail']:
            if self.portrait:
                frame=cover(self.art['12-training-portrait'],w,h,cx=.51,cy=.53,zoom=1.01+.04*u if kind=='training' else 1.13+.08*u)
            else:
                zoom=1.03+.10*u if kind=='training' else 1.29+.16*u
                frame=cover(self.art['06-training'],w,h,cx=.58+.018*u,cy=.49-.028*u,zoom=zoom)
            # Movement reads as one flowing gesture instead of tiny jitter.
        elif kind=='walker':
            frame=self.world(u,t,True)
            # Keep the quote on calm mist rather than the illustrated figure.
            if self.portrait:
                wash=np.broadcast_to(np.clip((.36-self.y)/.14,0,1),(h,w)).astype(np.float32)*.92
            else:
                wash=np.broadcast_to(np.clip((self.x-.48)/.16,0,1)*np.clip((.69-self.y)/.13,0,1),(h,w)).astype(np.float32)*.88
            frame=blend(frame,self.paper,wash)
        else:
            frame=blend(self.paper,self.world(.75,t),.11)
            fill=np.clip((local-.12-self.title_times)/.20,0,1)*self.title_ink
            frame=blend(frame,self.black,fill)
            for layer,delay,span in self.title_layers:
                # Letter groups develop at different times along an ink gesture.
                mask=self.ink((local-delay)/span,0)
                frame=blend(frame,layer[:,:,:3],layer[:,:,3].astype(np.float32)/255*mask)
            frame=self.petals(frame,t,5,.62)
        if with_text and kind!='training':frame=self.caption(frame,kind,local,duration)
        return frame

    def frame(self,t):
        i=next((i for i,s in enumerate(PLAN) if s['start']<=t<s['end']),len(PLAN)-1)
        local=t-PLAN[i]['start'];current=self.shot(i,local,t)
        transition=[0,.60,.63,.49,.91,.36,.22,.75,.85][i]
        if i>0 and local<transition:
            previous=self.shot(i-1,PLAN[i-1]['end']-PLAN[i-1]['start']+local,t,False)
            current=blend(previous,current,self.ink(local/transition,[0,0,1,3,2,0,0,2,1][i]))
        if t>DURATION-.65:
            current=blend(current,self.paper,float(ease((t-DURATION+.65)/.65)))
        return current

def soundtrack():
    sr=48000;n=sr*DURATION
    raw=subprocess.run([FF,'-hide_banner','-v','error','-i',str(ROOT/'assets/audio/river-flute.mp3'),'-t',str(DURATION),'-f','f32le','-ac','2','-ar',str(sr),'pipe:1'],stdout=subprocess.PIPE,check=True).stdout
    music=np.frombuffer(raw,np.float32).reshape(-1,2).copy()
    music=np.pad(music,((0,max(0,n-len(music))),(0,0)))[:n]
    axis=np.arange(n)/sr;rng=np.random.default_rng(9472)
    gain=np.interp(axis,[0,2,8.8,9.3,13,16.4,21.2,26.8,33,36.6,40],[0,.82,.9,.56,.24,.7,.86,1,1,.86,0])
    music*=gain[:,None]
    fx=np.zeros((n,2),np.float64)
    def put(sound,start,volume=1,pan=0):
        j=int(start*sr);count=min(len(sound),n-j)
        if j<0 or count<=0:return
        fx[j:j+count,0]+=sound[:count]*volume*(1-pan*.28)
        fx[j:j+count,1]+=sound[:count]*volume*(1+pan*.28)
    def drum(duration=1.8,weight=1):
        t=np.arange(int(duration*sr))/sr
        # Resonant membrane modes with a short, soft wooden attack.
        base=np.sin(2*np.pi*(54*t+11*(1-np.exp(-t*17))/17))*np.exp(-t*3.7)
        modes=.38*np.sin(2*np.pi*91*t)*np.exp(-t*5.1)+.16*np.sin(2*np.pi*143*t)*np.exp(-t*6.5)
        knock=sosfilt(butter(2,[320,2200],fs=sr,btype='bandpass',output='sos'),rng.standard_normal(len(t)))*np.exp(-t*48)*.31
        return (base+modes+knock)*np.minimum(t*550,1)*weight
    def gong(duration=4):
        t=np.arange(int(duration*sr))/sr
        result=np.zeros_like(t)
        for f,a,decay in [(82.4,.8,1.5),(167.7,.22,1.9),(248.1,.19,2.1),(393.6,.13,2.9),(566.3,.06,3.2)]:
            result+=a*np.sin(2*np.pi*f*t+.9*np.sin(t*3))*np.exp(-t*decay)
        return result*np.minimum(t*75,1)
    # Low-frequency atmosphere; no constant loud white-noise rain.
    air=sosfilt(butter(2,[240,2400],fs=sr,btype='bandpass',output='sos'),rng.standard_normal(n))*.0023
    air*=np.clip(axis/2,0,1)*np.clip((DURATION-axis)/3,0,1)
    fx[:,0]+=air;fx[:,1]+=np.roll(air,263)
    for at in [5.2,9.2,13.0,16.4,21.2,24.4,26.8,33.0]:
        dur=.72 if at<21 else .39
        t=np.arange(int(dur*sr))/sr
        hiss=sosfilt(butter(2,[180,2400],fs=sr,btype='bandpass',output='sos'),rng.standard_normal(len(t)))
        hiss*=np.sin(np.pi*t/dur)**2
        put(hiss,at-.12,.024,pan=(-.8 if int(at)%2 else .8))
    for at,level in [(9.2,.055),(13.0,.14),(16.4,.08),(21.2,.18),(24.4,.15),(26.8,.16),(33,.25)]:
        put(drum(),at,level)
    # A measured ceremonial pulse gathers speed in the training/resolve passage.
    beat=60/96
    for j,at in enumerate(np.arange(18.075,32.9,beat)):
        level=.025+(.067*(at-18)/(33-18))
        if j%4==0:level*=1.65
        if j%2==1:level*=.65
        put(drum(.8),float(at),level,pan=(-.55 if j%2 else .55))
    put(gong(),13,.06);put(gong(5.4),33,.14)
    tt=np.arange(int(2.6*sr))/sr
    silver=(np.sin(2*np.pi*1174.66*tt)*np.exp(-tt*3.6)+.22*np.sin(2*np.pi*2349.32*tt)*np.exp(-tt*6))*.025
    put(silver,1.25,.70,.65)
    # The final impact rings out into silence; fade the audio edit itself.
    mixed=music+fx
    mixed*=np.clip((DURATION-axis)/1.8,0,1)[:,None]
    mixed=np.tanh(mixed*.91)
    with wave.open(str(OUT/'source/soundtrack.wav'),'wb') as wav:
        wav.setnchannels(2);wav.setsampwidth(2);wav.setframerate(sr)
        wav.writeframes(np.clip(mixed*32767,-32768,32767).astype('<i2').tobytes())

STILLS=[2.8,7.3,11.4,14.8,19.5,23.1,25.4,30.4,36.6]
def preview():
    for aspect in ['landscape','portrait']:
        r=Film(aspect,.40);thumbs=[]
        for t in STILLS:
            img=Image.fromarray(r.frame(t))
            img.save(OUT/'source'/f'preview-{aspect}-{t}.jpg',quality=94)
            img.thumbnail((400,530));thumbs.append(img)
        cols=3 if aspect=='landscape' else 5;gap=15;rows=math.ceil(len(thumbs)/cols)
        cw=max(i.width for i in thumbs);ch=max(i.height for i in thumbs)+30
        sheet=Image.new('RGB',(cols*(cw+gap)+gap,rows*(ch+gap)+gap),(23,25,23));d=ImageDraw.Draw(sheet)
        for j,(im,t) in enumerate(zip(thumbs,STILLS)):
            x=gap+(j%cols)*(cw+gap);y=gap+(j//cols)*(ch+gap)
            sheet.paste(im,(x,y));d.text((x,y+im.height+7),f'{t:.1f}s',font=font('sans',17),fill=(233,223,201))
        sheet.save(OUT/f'storyboard-{aspect}.jpg',quality=95)

def render(aspect,scale=1,name=None):
    r=Film(aspect,scale)
    out=OUT/(name or f'삼류연정-먹그림-티저-{aspect}.mp4')
    credit='River Flute - Kevin MacLeod (incompetech.com), CC BY 4.0 https://creativecommons.org/licenses/by/4.0/ ; 40-second excerpt, volume/fade edit, added original percussion and sound design.'
    cmd=[FF,'-y','-hide_banner','-loglevel','warning','-f','rawvideo','-pixel_format','rgb24','-video_size',f'{r.w}x{r.h}','-framerate',str(FPS),'-i','pipe:0','-i',str(OUT/'source/soundtrack.wav'),'-map','0:v:0','-map','1:a:0','-c:v','libx264','-preset','fast','-crf','18','-pix_fmt','yuv420p','-r',str(FPS),'-af','loudnorm=I=-18:TP=-1.5:LRA=11','-c:a','aac','-b:a','256k','-ar','48000','-t',str(DURATION),'-movflags','+faststart','-metadata','title=삼류연정 | 한 사람의 강호','-metadata','comment='+credit,'-metadata','description=Layered ink-motion cinematic teaser | '+aspect,str(out)]
    start=time.monotonic()
    with (OUT/'source'/f'encode-{aspect}.log').open('wb') as log:
        proc=subprocess.Popen(cmd,stdin=subprocess.PIPE,stderr=log)
        try:
            for n in range(FPS*DURATION):
                proc.stdin.write(r.frame(n/FPS).tobytes())
                if n%150==0:print(json.dumps({'aspect':aspect,'seconds':n/FPS,'total':DURATION,'elapsed':round(time.monotonic()-start,1)}),flush=True)
            proc.stdin.close();code=proc.wait()
        except BaseException:
            proc.stdin.close();proc.wait();raise
    if code:raise RuntimeError('Encoding failed; see log')
    print(json.dumps({'file':str(out),'bytes':out.stat().st_size,'elapsed':round(time.monotonic()-start,1)},ensure_ascii=False),flush=True)

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('mode',choices=['prepare','preview','audio','landscape','portrait']);p.add_argument('--scale',type=float,default=1);p.add_argument('--name');a=p.parse_args()
    if a.mode=='prepare':soundtrack();preview()
    elif a.mode=='preview':preview()
    elif a.mode=='audio':soundtrack()
    else:render(a.mode,a.scale,a.name)
