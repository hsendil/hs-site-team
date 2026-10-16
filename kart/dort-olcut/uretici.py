# -*- coding: utf-8 -*-
import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
from ortak import *
C=[]
def c1(d):
    y=label(d,"ITIL 4 · Standart değişiklik")
    y=para(d,"Ajanın her dokunuşu bir değişikliktir.",F("Bold",88),CREAM,M,y+30,MAXW,100)
    y=para(d,"Kapın her şeye bakıyorsa kurduğun şey kapı değil, kuyruktur.",F("Regular",44),BODY,M,y+40,MAXW,62)
    d.text((M,H-250),"Dört ölçüt, tek kural.",font=F("Italic",38),fill=LILAC)
C.append(c1)
def c2(d):
    y=label(d,"Sorun nerede")
    d.text((M,y),"LİSTE BOŞ",font=F("Bold",120),fill=CREAM)
    d.text((M,y+145),"KAPI HER ŞEYE BAKAR",font=F("Bold",60),fill=LAV)
    y+=250
    y=para(d,"Standart değişiklik: düşük riskli, iyi anlaşılmış, tam belgelenmiş, her seferinde ek onay gerektirmeden uygulanabilen, önceden yetkilendirilmiş değişiklik.",F("Regular",42),BODY,M,y,MAXW,60)
    d.line([M,H-330,M+300,H-330],fill=ACC,width=3)
    para(d,"Kaynak: AXELOS, ITIL 4 Change Enablement uygulama rehberi, 2020. Ajanlardan önce yazıldı.",F("Italic",34),LILAC,M,H-294,MAXW,48)
C.append(c2)
def c3(d):
    y=label(d,"Ölçülen büyüklük")
    d.text((M,y),"%61,38",font=F("Bold",150),fill=CREAM)
    y+=200
    y=para(d,"EASE 2026 çalışması: açık kaynak depolarında 33.596 AI üretimi birleştirme talebinin 20.621'inde kayıtlı hiçbir inceleme yok.",F("Regular",42),BODY,M,y,MAXW,60)
    y=para(d,"Ajanın açtığı alt kümede yüzde 84'ü ya hiç incelenmemiş ya da yalnız başka ajanlarca incelenmiş.",F("Regular",42),BODY,M,y+24,MAXW,60)
    d.line([M,H-300,M+300,H-300],fill=ACC,width=3)
    para(d,"Kapı duruyor, okuma yok.",F("SemiBold",42),LAV,M,H-264,MAXW,58)
C.append(c3)
def c4(d):
    y=label(d,"Yanlış soru, doğru soru")
    d.text((M,y),"Yanlış:",font=F("SemiBold",40),fill=LILAC)
    y=para(d,"Ajana güvenilir mi?",F("Bold",58),(150,140,190),M,y+56,MAXW,70)
    y+=40
    d.text((M,y),"Doğru:",font=F("SemiBold",40),fill=LILAC)
    y=para(d,"Değişiklik geri alınabilir mi, kalıbı sabit mi?",F("Bold",58),CREAM,M,y+56,MAXW,70)
    y+=60
    d.line([M,y,M+6,y+150],fill=ACC,width=6)
    para(d,"Güven kişiye bakar, risk işe bakar. Değişiklik yönetimi ikincisini ölçmek için kurulmuştur.",F("Italic",42),BODY,M+44,y,MAXW-44,58)
C.append(c4)
def c5(d):
    y=label(d,"Dört ölçüt")
    rows=[("Geri alınabilir mi?","Tek commit ile geri alınıyor"),("Kalıbı sabit mi?","Aynı iş en az beş kez aynı biçimde yapıldı"),("Kapsamı dar mı?","Tek dizin veya tek veri dosyası değişiyor"),("Kanıtı otomatik mi?","Yeşil bir koşu veya makine kontrolü geçti")]
    for i,(a,b) in enumerate(rows):
        d.ellipse([M,y+4,M+56,y+60],fill=ACC)
        d.text((M+28,y+32),str(i+1),font=F("Bold",32),fill=LAV,anchor="mm")
        d.text((M+80,y),a,font=F("Bold",46),fill=CREAM)
        y=para(d,"Evet: "+b,F("Regular",36),BODY,M+80,y+66,MAXW-80,50)+34
    para(d,"Eşleme bana ait, rehberin kendi metni değil.",F("Italic",34),LILAC,M,H-230,MAXW,48)
C.append(c5)
def c6(d):
    y=label(d,"Karar kuralı")
    d.text((M,y),"4 / 4 EVET",font=F("Bold",96),fill=CREAM)
    y=para(d,"Standart değişiklik: önceden onaylı kapsama girer.",F("Regular",42),BODY,M,y+120,MAXW,60)
    y+=50
    d.text((M,y),"1 HAYIR",font=F("Bold",96),fill=LILAC)
    y=para(d,"Normal değişiklik: kapıya gider.",F("Regular",42),BODY,M,y+120,MAXW,60)
    y+=40
    d.text((M,y),"Tipik hayırlar:",font=F("SemiBold",40),fill=LILAC); y+=70
    madde(d,["Şema göçü, bağımlılık yükseltmesi","Ortak bileşen, yapılandırma, yayın zinciri","İlk kez yapılan iş"],y)
C.append(c6)
def c7(d):
    y=label(d,"Asıl soru")
    y=para(d,"Bu hafta ajanının ürettiği değişikliklerin kaçı dört ölçütü geçiyor?",F("Bold",54),LAV,M,y,MAXW,70)
    y+=30
    d.line([M,y,M+6,y+70],fill=ACC,width=6)
    y=para(d,"Sayamıyorsan kapın da sayamıyor.",F("Italic",44),BODY,M+44,y,MAXW-44,60)+30
    y=para(d,"Şerh: tek kişilik bir düzenek, kendi talebimi onaylayan ikinci bir insan yok.",F("Italic",34),LILAC,M,y,MAXW,48)
    y+=40
    d.text((M,y),"Sunum değil, çalışan sistem.",font=F("Bold",52),fill=CREAM)
    d.text((M,y+76),"Yazının tamamı: hayrettinsendil.tr",font=F("Regular",36),fill=LILAC)
    d.text((M,y+122),"(profildeki link)",font=F("Regular",32),fill=LILAC)
    imza(d,H-260)
C.append(c7)
print(uret(C, os.path.dirname(os.path.abspath(__file__))))
