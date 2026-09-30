# -*- coding: utf-8 -*-
# Instagram karusel kart ortak katmanı. kart-uret.yml bu dosyayı kullanır.
# Marka: lacivert-mor degrade, Poppins, 1080x1350. Ok glifi Poppins'te yok, ok() ile çizilir.
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import numpy as np, os
W, H = 1080, 1350
M = 96
import os as _os
FD = _os.environ.get("FONT_DIR", "/usr/share/fonts/truetype/google-fonts/").rstrip("/") + "/"
_MAP = {"SemiBold": "Medium", "Black": "Bold", "ExtraBold": "Bold"}
def F(w, s): return ImageFont.truetype(FD + "Poppins-" + _MAP.get(w, w) + ".ttf", s)
LAV=(245,243,255); CREAM=(233,225,255); LILAC=(167,139,250); ACC=(124,58,237); BODY=(207,198,236); DIM=(72,60,130)
MAXW = W - 2*M
def bg():
    x=np.linspace(0,1,W)[None,:]; y=np.linspace(0,1,H)[:,None]; t=(x+y)/2
    c0=np.array([30,27,75.]); c1=np.array([45,27,105.])
    f=np.where(t<=0.4, t/0.4, (1-t)/0.6)[...,None]
    arr=c0+(c1-c0)*f
    img=Image.fromarray(arr.astype('uint8'),'RGB')
    glow=Image.new("RGB",(W,H),(0,0,0)); gd=ImageDraw.Draw(glow)
    gd.ellipse([W*0.45,-H*0.18,W*1.30,H*0.52],fill=(58,32,128))
    glow=glow.filter(ImageFilter.GaussianBlur(190))
    return Image.blend(img, Image.blend(img, glow, 0.55), 0.55)
def wrap(d,text,font,maxw):
    out,line=[], ""
    for w in text.split():
        t=(line+" "+w).strip()
        if d.textlength(t,font=font)<=maxw: line=t
        else:
            if line: out.append(line)
            line=w
    if line: out.append(line)
    return out
def para(d,text,font,fill,x,y,maxw,lh):
    for ln in wrap(d,text,font,maxw): d.text((x,y),ln,font=font,fill=fill); y+=lh
    return y
def tr_upper(s): return s.replace("i","İ").replace("ı","I").upper()
def label(d,text,y=M):
    d.text((M,y)," ".join(tr_upper(text)),font=F("SemiBold",30),fill=LILAC)
    d.line([M,y+58,M+92,y+58],fill=ACC,width=5); return y+96
def dots(d,idx,total):
    r,gap=7,30; x0=(W-(total*gap-gap))//2
    for i in range(total):
        c=LILAC if i==idx else DIM
        d.ellipse([x0+i*gap-r,H-92-r,x0+i*gap+r,H-92+r],fill=c)
def madde(d,items,y,fs=38,lh=52):
    for t in items:
        d.ellipse([M,y+18,M+14,y+32],fill=ACC)
        y=para(d,t,F("Regular",fs),BODY,M+44,y,MAXW-44,lh)+20
    return y
def imza(d,y):
    d.line([M,y,M+300,y],fill=ACC,width=3)
    d.text((M,y+30),"Hayrettin Şendil, PMP®",font=F("SemiBold",34),fill=LAV)
    d.text((M,y+78),"AI / Context Engineering Eğitmeni",font=F("Regular",30),fill=LILAC)
def uret(cards,out):
    os.makedirs(out,exist_ok=True); base=bg(); yollar=[]
    for i,fn in enumerate(cards):
        img=base.copy(); d=ImageDraw.Draw(img); fn(d); dots(d,i,len(cards))
        p=os.path.join(out,"%02d.jpg"%(i+1)); img.save(p,"JPEG",quality=93,optimize=True); yollar.append(p)
    # kontak
    k=Image.new("RGB",(1440,900),(22,20,50)); tw,th=360,450
    for i,p in enumerate(yollar):
        im=Image.open(p).resize((tw,th)); k.paste(im,((i%4)*tw,(i//4)*th))
    k.save(os.path.join(out,"_kontak.jpg"),quality=88)
    return yollar
def ok(d,x,y,w,h=None,fill=LILAC,kal=6):
    # yatay ok: (x,y) orta hat, uzunluk w
    d.line([x,y,x+w-18,y],fill=fill,width=kal)
    d.polygon([(x+w,y),(x+w-26,y-16),(x+w-26,y+16)],fill=fill)
